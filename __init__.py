import os
import re
import time
from xml.dom.minidom import parseString
from xml.sax.saxutils import escape
from typing import List
# import logging
# logging.basicConfig(filename="TransFlow.log",level=logging.INFO)
# logger = logging.getLogger(__name__)
import toml
# import pandas as pd
import deepl
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain, SequentialChain
import requests
from pyairtable import Api

config_path = os.path.join(os.path.dirname(__file__), "config.txt")
with open(config_path, "a+") as f:
    f.seek(0)  # 移动文件指针到文件开头
    config = toml.load(f)

    model = config.get("Model")
    llm_api_key1 = config.get("Model_API_key")
    llm_api_key2 = config.get("Model_API_key2")
    if llm_api_key2 is None:
        llm_api_key2 = llm_api_key1
    
    deepl_api_key1 = config.get("DeepL_API_key") # 5225af3e-9652-80ce-c74e-307ead3e9880:fx
    deepl_api_key2 = config.get("Model_API_key2")
    if deepl_api_key2 is None:
        deepl_api_key2 = deepl_api_key1

    translator_public = deepl.Translator(deepl_api_key1)
    translator_private = deepl.Translator(deepl_api_key2)

    if model == 'GPT (OpenAI)':
        from langchain_openai import ChatOpenAI
        llm_public = ChatOpenAI(model_name="gpt-4o-2024-11-20", openai_api_key=llm_api_key1)
        llm_private = ChatOpenAI(model_name="gpt-4o-2024-11-20", openai_api_key=llm_api_key2)
    elif model == 'Claude (Anthropic)':
        from langchain_anthropic  import ChatAnthropic
        llm_public = ChatAnthropic(model_name="claude-3-5-haiku-latest", api_key=llm_api_key1)
        llm_private = ChatOpenAI(model_name="claude-3-5-haiku-latest", openai_api_key=llm_api_key2)
    elif model == 'Gemini (Google)':
        from langchain_google_genai import ChatGoogleGenerativeAI
        llm_public = ChatGoogleGenerativeAI(model='gemini-2.0-flash', api_key=llm_api_key1)
        llm_private = ChatOpenAI(model_name="gemini-2.0-flash", openai_api_key=llm_api_key2)

def get_model(user, model='translator'):
    if user == 'public':
        if model == 'translator':
            return translator_public
        elif model == 'llm':
            return llm_public
    else:
        # if user in users and quota is enough:
        if model == 'translator':
            return translator_private
        elif model == 'llm':
            return llm_private

import nltk
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize
nltk.download('punkt_tab')
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/wordnet.zip')
except LookupError:
    nltk.download('punkt')
    nltk.download('wordnet')

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

app = FastAPI(title="TransFlow")

# 设置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有域名
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有方法
    allow_headers=["*"],  # 允许所有头部
)

from os import path
import platform

cwd = path.abspath(path.dirname(__file__))
templates = Jinja2Templates(directory=cwd)
app.mount("/static", StaticFiles(directory=cwd+"/static"), name="static")
chat_bot = None

@app.get("/")
async def root():
    return RedirectResponse(url="/public")

@app.get("/{user}")
def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

class TranslationRequest(BaseModel):
    text: str
    target_lang: str
    source_lang: str
    annotation: str

@app.api_route('/{user}/translate', methods=['POST'])
def translate(user: str, req: TranslationRequest):
    print('Translation started.')
    translator = get_model(user, model='translator')

    escaped_annotation = re.sub(r'>([^<>]+)<', lambda m: f'>{escape(m.group(1))}<', req.annotation) # escape some characters for the parsing issue
    collection = parseString(escaped_annotation).documentElement
    # 生成翻译参考词汇表
    entries = {}
    if glossary := collection.getElementsByTagName("glossary")[0].firstChild:
        for pair in glossary.data.split(';'):
            pair = pair.strip()
            if len(pair) > 0:
                k,v = pair.split(':')
                k = k.strip()
                v = v.strip()
                entries[k] = v
    # if untranslatable := collection.getElementsByTagName("do_not_translate")[0].firstChild:
    #     for k in untranslatable.data.split(';'):
    #         k = k.strip()
    #         if len(k) > 0:
    #             entries[k] = k

    if len(entries) == 0:
        entries = {'none': 'none'}

    # 生成翻译参考上下文
    context = re.sub(r'<glossary>.*?</glossary>', '', req.annotation, flags=re.S)
    context = re.sub(r'<do_not_translate>.*?</do_not_translate>', '', context, flags=re.S)
    context = context.replace('<annotation>','').replace('</annotation>','').strip()

    # 建立临时词汇表
    temp_glossary = translator.create_glossary(
        "temp",
        source_lang=req.source_lang,
        target_lang=req.target_lang,
        entries=entries,
    )
    glossary_id = temp_glossary.glossary_id
    print('Glossary created.')

    # 开始翻译
    result = translator.translate_text(req.text, 
        source_lang=req.source_lang, target_lang=req.target_lang, 
        glossary=glossary_id, context=context)

    print('Translation done.')

    # 删除临时词汇表
    translator.delete_glossary(glossary_id)
    print('Glossary deleted.')

    return result.text

class LLMRequest(BaseModel):
    prompt: str
    completion_mark: str
    new_chat: bool
    close: bool

# 截取字符串，保留给定位置pos最近的换行符前/后的部分
def truncate_string(s, pos):
    if len(s) <= pos:
        return s
    
    # 查找pos前后的最近换行符
    before_newline = s[:pos].rfind('\n')
    after_newline = s[pos:].find('\n')
    
    # 返回最近的换行符前的部分
    return s[:before_newline] if (pos > 0 and before_newline != -1) else s[pos+after_newline:] if (pos < 0 and after_newline != -1) else s

@app.api_route('/{user}/LLMchat', methods=['POST'])
def LLMchat(user: str, req: LLMRequest):
    print('Received chat request.', flush=True)

    llm = get_model(user, model='llm')

    prompt = req.prompt
    prompt_cur = prompt
    
    # 发送消息到 ChatGPT
    response = ''
    finished_check = lambda x, response: x in response if x!='' else True

    pattern = re.compile(r'<p_(\d+)>(.*?)<\/p_\1>', re.DOTALL)
    prompt_paragraph_last = max([int(idx) for idx, text in pattern.findall(prompt)])
    
    for tried_time in range(10):
        print('\nsending prompt:\n', truncate_string(prompt, 500) + '\n\n...\n...\n\n' + truncate_string(prompt, -500) + '\n')
        response_cur = llm.invoke([("system", prompt_cur),("human", ""),]).content
        
        # print('\nresponse_cur:\n', truncate_string(response_cur, 250) + '\n\n...\n...\n\n' + truncate_string(prompt, -250) + '\n')
        print('\nresponse_cur:\n', response_cur)
        
        if len(pattern.findall(response_cur)) > 0:
            response += response_cur
            # if '[原文]' in response_cur and '[机翻]' in response_cur:
            #     response += ''.join([f'<p_{idx}>{text.split("[修正]")[-1][1:]}</p_{idx}>\n' 
            #         for _, idx, text in pattern.findall(response_cur)])
            # else:
            #     response += ''.join([f'<p_{idx}>{text}</p_{idx}>\n' for _, idx, text in pattern.findall(response_cur)])

            if finished_check(req.completion_mark, response):
                print('Finished.')
                break
            if len(list(pattern.findall(response_cur)))==0:
                print('The task did not finished. Something is wrong.')
                break
            else:
                p_last = max([int(idx) for idx, text in pattern.findall(response_cur)])

                # 去除已有的部分
                prompt_cur = re.sub(re.compile(rf'<p_1>(.*?)<\/p_{p_last}>', re.DOTALL), f"", prompt)

                prompt_cur = re.sub(r"(```)([\s\S]*)(```)", 
                            lambda m: m.group(1) + re.sub(r"<p_1>", f"<p_{p_last+1}>", 
                                            re.sub(r"</p_1>", f"</p_{p_last+1}>", 
                                            re.sub(r"<p_2>", f"<p_{p_last+2}>", 
                                            re.sub(r"</p_2>", f"</p_{p_last+2}>", m.group(2))))), 
                            prompt_cur)
                prompt_cur = re.sub(r"`<p_1>`", f"`<p_{p_last+1}>`", prompt_cur)
                print('The task did not finished. Retry to complete it.')

        else:
            response += response_cur
            break
    else:
        return response

    # while True:
    #     response_cur = llm.invoke(prompt).content
    #     response_cur = re.sub(r'^```.*?\n|\n```$', '', response_cur, flags=re.DOTALL)
    #     # 
    #     response_cur

    #     # 找到response_cur里重复上一次输出的部分，并去除
    #     if len(response) > 0:
    #         note = (0, 0) # 记录最长重复子串的长度和结尾位置
    #         for init_len in range(1, 10): # 为了避免找错重复子串，尝试多次取最长的
    #             idx = response_cur.find(response[-init_len:])
    #             if idx > -1:
    #                 j = 0
    #                 while idx-j < len(response_cur) and init_len+j < len(response) and response_cur[idx-j] == response[-init_len-j]:
    #                     j += 1
    #                 if init_len+j-1 > note[0]:
    #                     note = (init_len+j-1, idx+init_len)
    #         print(note[0], note[1] * 0.8,note[1])
    #         if note[0] > note[1] * 0.8: # 如果确实response_cur开头和上一次输出的结尾有大幅重复
    #             response_cur = response_cur[note[1]:]

    #     print('\nresponse_cur:\n', truncate_string(response_cur, 100) + '\n\n...\n...\n\n' + truncate_string(response_cur, -100) + '\n')
    #     response += response_cur
    #     print(req.completion_mark, req.completion_mark in response, response[-100:])
    #     if not finished_check(req.completion_mark, response):
    #         prompt = 'continue'
    #     else:
    #         break

    print('Chat done.')
    return response

class GlossaryRequest(BaseModel):
    article: str
    group: str

@app.api_route('/{user}/access_glossary', methods=['POST'])
def access_glossary(user: str, req: GlossaryRequest):
    article = req.article
    # Initialize the lemmatizer
    lemmatizer = WordNetLemmatizer()
    # Tokenize and lemmatize the article text
    tokens = word_tokenize(article.lower())  # Tokenize and convert to lower case
    lemmatized_article = ' '.join([lemmatizer.lemmatize(token) for token in tokens])


    API_KEY = 'pateFUbj2xAfLnoIf.3b5d0042800e18ccc809c5c9a5c52480721269abc048461d65085548f6dc1bea'
    api = Api(API_KEY)

    for base in api.bases():
        if base.name == "Glossary-" + user:
            base_id = base.id
            break
    table_name = req.group
    table = api.table(base_id, table_name)

    # find the terms in the article
    current = '| Term | Category | Translation |\n|---|---|---|\n'
    for record in table.all():
        term, category, translation = record['fields'].values()
        if len(term) > 0:
            # Lemmatize the target expression (which could be a MWE)
            target_tokens = word_tokenize(term.lower())
            target_lemma_expression = ' ' + ' '.join([lemmatizer.lemmatize(token) for token in target_tokens]) + ' '
            if target_lemma_expression in lemmatized_article:
                current += f'| {term} | {category} | {translation} |\n'

    print('Glossary accessed.')
    return current

class GlossaryUpdateRequest(BaseModel):
    glossary: List
    group: str

@app.api_route('/{user}/add_to_online_glossary', methods=['POST'])
def add_to_online_glossary(user: str, req: GlossaryUpdateRequest):
    API_KEY = 'pateFUbj2xAfLnoIf.3b5d0042800e18ccc809c5c9a5c52480721269abc048461d65085548f6dc1bea'
    api = Api(API_KEY)

    for base in api.bases():
        if base.name == "Glossary-" + user:
            base_id = base.id
            break
    table_name = req.group
    table = api.table(base_id, table_name)

    onlined_glossary = set(tuple(record['fields'].values()) for record in table.all())

    new_glossary = set(tuple(item) for item in req.glossary)

    # avoid adding the redundant pairs
    new_glossary -= onlined_glossary
    new_glossary = [{"Term": term, "Category": category, "Translation": translation}
                    for term, category, translation in new_glossary]

    # group a list by 10 to make a batch
    def batch_list(lst, n):
        for i in range(0, len(lst), n):
            yield lst[i:i + n]
    for g in batch_list(new_glossary, 10):
        table.batch_create(g)

# class ArticleRequest(BaseModel):
#     texts: List[str]
#     languages: List[str]
#     names: List[str]
#     sentence_segment: bool

# def merge_short_elements(lst):
#     i = 0
#     while i < len(lst):
#         if len(lst[i]) <= 1:
#             if i == 0:
#                 # 只能合并到右边
#                 lst[i + 1] = lst[i] + lst[i + 1]
#                 del lst[i]
#             elif i == len(lst) - 1:
#                 # 只能合并到左边
#                 lst[i - 1] += lst[i]
#                 del lst[i]
#                 i -= 1  # 回退索引，避免跳过元素
#             else:
#                 # 选择合并到较短的那个
#                 if len(lst[i - 1]) <= len(lst[i + 1]):
#                     lst[i - 1] += lst[i]
#                     del lst[i]
#                     i -= 1  # 回退索引，避免跳过元素
#                 else:
#                     lst[i + 1] = lst[i] + lst[i + 1]
#                     del lst[i]
#         else:
#             i += 1
#     return lst

# from sentencex import segment
# @app.api_route('/{user}/combine_articles', methods=['POST'])
# def combine_articles(user: str, req: ArticleRequest):
#     texts = req.texts
#     languages = req.languages
#     if len(languages) == 1:
#         languages = [languages[0] for i in range(len(texts))]
#     names = req.names
#     if len(names) == 1:
#         names = [names[0] for i in range(len(texts))]

#     # print(texts)

#     new_texts = dict()
#     # find all matches to groups
#     pg_pattern = re.compile(r"<p_(\d+)>\n{0,}([\s\S]*?)\n{0,}<\/p_\d+>")
#     for text, language in zip(texts, languages):
#         for pg in pg_pattern.finditer(text):
            
#             pg_idx, content = int(pg.group(1)), pg.group(2).strip()
#             if pg_idx not in new_texts:
#                 new_texts[pg_idx] = []
            
#             if '<s_1>' in content:
#                 matches = re.findall(r'<(s_\d+)>(.*?)</\1>', content, flags=re.DOTALL)
#                 content = [sent for tag, sent, *_ in matches]
#             elif req.sentence_segment:
#                 language = language.lower()
#                 content = list(segment(language, content))
#                 content = merge_short_elements(content)

#                 # if language in ['chinese', 'japanese']:
#                 #     # Regular expression to match sentence-ending punctuation
#                 #     pattern = re.compile(r'(?<=[。！？])')
#                 #     # Split text using the pattern
#                 #     sentences = pattern.split(content)
#                 #     # Remove any empty strings from the result
#                 #     content = [sentence.strip() for sentence in sentences if sentence.strip()]
#                 # else:
#                 #     content = nltk.sent_tokenize(content, language=language)

#             new_texts[pg_idx].append(content)

#     version_number = len(names)
#     xml = '<article>\n'
#     for pg_idx, versions in new_texts.items():
#         xml += f"<p_{pg_idx}>\n"

#         if req.sentence_segment:
#             # Check if the number of sentences is the same in all versions
#             num_sentences = len(versions[0])
#             if not all(len(version) == num_sentences for version in versions):
#                 # combine the sentences in each version
#                 versions = [[' '.join(version)] for version in versions]
#                 num_sentences = 1
            
#             for sent_idx in range(num_sentences):
#                 xml += f"\t[s_{sent_idx+1}]:\n"

#                 versions_ = [version[sent_idx] for version in versions]
#                 names_ = names
#                 if len(names_[0]) > 0:
#                     if len(set(names)) == 1:
#                         versions_ = set(versions_)
#                         names_ = [f'{names[0]}_{i+1}' for i in range(len(versions_))]
#                     for v_name, v_sent in zip(names_, versions_):
#                         xml += f"\t\t[{v_name}]: {v_sent}\n"
#                 else:
#                     for v_sent in versions_:
#                         xml += f"\t\t{v_sent}\n"
#         else:
#             names_ = names
#             if len(names_[0]) > 0:
#                 for v_name, v_pg in zip(names_, versions):
#                     xml += f"\t[{v_name}]: {v_pg}\n"
#             else:
#                 for v_sent in versions:
#                     xml += f"\t\t{v_sent}\n"

#         xml += f"</p_{pg_idx}>\n"
#     xml += '</article>'

#     return xml


if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.getenv("PORT", 8000))  # Railway 会提供 PORT 变量
    uvicorn.run(app, host="0.0.0.0", port=port, proxy_headers=True)