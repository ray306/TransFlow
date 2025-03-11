// 递归函数：将XML字符串解析为字典
function xmlToDict(xmlString) {
    // 去除字符串前后的换行和空白字符
    xmlString = xmlString.trim();
    
    // 检查是否是成对的 XML 标签
    // 正则表达式：1. 匹配<xx>的内容； 2. 匹配 <xx>...</xx> 之间的内容
    let xmlMatches = [...xmlString.matchAll(/<(.*?)>(.*?)<\/\1>/gs)];
    if (xmlMatches.length > 0) {
        let result = {};
        for (let match of xmlMatches) {
            let tag = match[1].trim() + "|xml"; // 记录标签名称并标记为 XML
            result[tag] = xmlToDict(match[2]); // 递归解析子内容
        }
        return result;
    }
    
    // 检查是否是键值对格式
    // # 正则表达式：1. 匹配[xx]:的内容； 2. 匹配 [xx]: 之后的所有内容，直到下一个 [xx]: 、</xx>、或文本结束
    let kvMatches = [...xmlString.matchAll(/\[(.+?)\]:\s*(.+?)(?=(\s*\[.+?\]:)|\s*$|\s*<\/)/gs)];
    if (kvMatches.length > 0) {
        let result = {};
        for (let match of kvMatches) {
            let tag = match[1].trim() + "|kv"; // 记录键名称并标记为键值对
            result[tag] = xmlToDict(match[2]); // 递归解析值内容
        }
        return result;
    }
    
    // 检查是否是普通单行，则返回空字符串（或处理为叶节点）
    else {
        return xmlString.trim();
    }
}

function dictFilter(data, operations, level = 0) {
    if (typeof data === 'string') {
        return data;
    }
    
    let operation = operations.split(',')[level]; // 获取当前层级的操作
    
    if (operation[0] === '+') {
        if (operation.length === 1) {
            // 保留所有键值对
            return Object.fromEntries(
                Object.entries(data).map(([key, value]) => [key, dictFilter(value, operations, level + 1)])
            );
        } else {
            // 仅保留特定键的键值对
            return Object.fromEntries(
                Object.entries(data).filter(([key]) => key.split('|')[0] === operation.slice(1))
                    .map(([key, value]) => [key, dictFilter(value, operations, level + 1)])
            );
        }
    }
    
    if (operation[0] === '-') {
        let filteredList = Object.entries(data)
            .filter(([key]) => operation.length === 1 || key.split('|')[0] === operation.slice(1))
            .map(([_, value]) => dictFilter(value, operations, level + 1));
        
        if (filteredList.length === 1) {
            return filteredList[0];
        }
        if (typeof filteredList[0] === 'string' && operations.split(',').pop() === 'concat') {
            return filteredList.join(' ');
        }
        return filteredList;
    }
}

function dictToXml(data, level = 0) {
    let indent = '\t'.repeat(level); // 计算当前缩进级别
    
    // 引进替代换行符，避免被concat合并误伤
    if (typeof data === 'string') {
        return indent + data; 
    }
    if (Array.isArray(data)) {
        return indent + data.join(indent); // 处理数组情况
    }
    
    let xmlString = "";
    for (let [key, value] of Object.entries(data)) {
        let [tag, tagType] = key.trim().split('|'); // 解析标签名称和类型
        let subContent = dictToXml(value, level + 1);
        
        if (tagType === 'xml') {
            xmlString += `${indent}<${tag}>\n${subContent}\n${indent}</${tag}>\n`;
        } else if (tagType === 'kv') {
            xmlString += `${indent}[${tag}]:\n${subContent}\n`;
        }
    }
    
    return xmlString;
}

function standardizeIndentation(text) {
    let lines = text.split('\n');
    let indents = new Set();
    
    // 统计所有缩进层级
    lines.forEach(line => {
        let stripped = line.trimStart();
        if (stripped) {
            indents.add(line.length - stripped.length);
        }
    });
    
    // 生成标准化缩进映射
    let indentsMap = [...indents].sort((a, b) => a - b).reduce((map, indent, i) => {
        map[indent] = ' '.repeat(i * 4);
        return map;
    }, {});
    
    // 应用标准化缩进
    return lines.map(line => {
        let stripped = line.trimStart();
        return stripped ? indentsMap[line.length - stripped.length] + stripped : line;
    }).join('\n');
}

function xmlReformat(xml, operations) {
    let xmlDict = xmlToDict(xml); // 解析 XML 字符串为字典
    xmlDict = dictFilter(xmlDict, operations); // 过滤数据
    let xmlString = dictToXml(xmlDict); // 重新转换回 XML 格式
    xmlString = standardizeIndentation(xmlString); // 规范化缩进
    xmlString = xmlString.replace(/྾/g, '\n'); // 处理替代换行符
    return xmlString;
}

function format(textarea) {
    var article = textarea.value.trim();

    if (textarea.getAttribute('operations')) {
        article = xmlReformat(article, textarea.getAttribute('operations'));
    }

    var level1 = textarea.getAttribute('xml-label');
    var level2 = '';
    if (level1.includes('|')) {
        [level1, level2] = level1.split('|');
        level2 = level2.split('_?')[0];
    }
    else if (level1.includes('_?')) {
        level2 = level1.split('_?')[0];
        level1 = ''
    }

    if (article != "") {     
        // 使用正则表达式将上一行尾的空白字符和下一行的换行符替换为一个换行符
        article = article.replace(/[ \t]*\n/g, "\n");
        // 使用正则表达式将超过两个连续的换行符替换为两个连续换行符
        article = article.replace(/\n{2,}/g, "\n\n");

        // 如果有level1标签，就摘取level1标签内的内容以供后面处理；否则就摘取整个字符串
        level1_text = article;
        if (level1 != "") {
            var level1_text = new RegExp(`<${level1}>\n?([\\s\\S]*?)\n?<\\/${level1}>`, 'g').exec(article);
            if (level1_text) {
                level1_text = level1_text[1];
            }
        }

        // 如果有level2标签，就去除标签之间的连续换行符
        if (level1_text.includes(`<${level2}_`)&&level1_text.includes(`</${level2}_`)) {
            level1_text = level1_text.replace(/>\n{0,}</g, ">\n<");
            level1_text = level1_text.replace(/\n\n/g, ""); //去除两次输出（由continue衔接）造成的双换行符
        }
        else if (level2 != '') {
            // 使用正则表达式捕获连续换行符及其前后的内容
            matches = article.match(/(.|\n)+?(\n{2,}|$)/g);
            // 使用捕获的内容进行分段
            paragraphs = matches.map((paragraph, index) => {
                return `<${level2}_${index + 1}>${paragraph.trim()}\n</${level2}_${index + 1}>`;
            });
            level1_text = paragraphs.join('\n');
        }

        if (level1 == "") {
            textarea.value = level1_text;
        }
        else {
            textarea.value = `<${level1}>\n${level1_text}\n</${level1}>`;
        }

    }
    return textarea.value
}

document.getElementById('format_annotation').addEventListener('click', async function() {
    var textarea = document.getElementById(this.getAttribute('textarea-id'));
    document.getElementById('glossary').value = '| Term | Category | Translation |' + textarea.value.match(/Term\s*\|\s*Category\s*\|\s*Translation\s*\|([\s\S]*\|)[^|]*<annotation>/)[1]
    // 使用按钮上的 textarea-id 属性获取对应的 textarea ID
    
    annotation = /<annotation>(.*?)<\/annotation>/gs.exec(textarea.value)[1];
    document.getElementById('wording').value = /<wording>(.*?)<\/wording>/g.exec(annotation)[1];
    document.getElementById('category').value = /<category>(.*?)<\/category>/g.exec(annotation)[1];
    document.getElementById('polishing_scheme').value = /<polishing_scheme>(.*?)<\/polishing_scheme>/gs.exec(textarea.value)[1];
});

document.querySelectorAll('.format_article').forEach(button => {
    button.addEventListener('click', function() {
        // 使用按钮上的 textarea-id 属性获取对应的 textarea ID
        var textarea = document.getElementById(this.getAttribute('textarea-id'));
        format(textarea);
    });
});






// import re
// # 递归函数：将XML字符串解析为字典
// def xml_to_dict(xml_string):
//     xml_string = xml_string.strip('\n')
//     # 匹配标签对
//     if re.search(r'\s*<.*?>\n', xml_string): # 如果是成对xml标签
//         # 正则表达式：1. 匹配<xx>的内容； 2. 匹配 <xx>...</xx> 之间的内容
//         matches = re.findall(r'<(.*?)>(.*?)</\1>', xml_string, flags=re.DOTALL)
//         return {tag.strip()+'|xml': xml_to_dict(content) 
//                     for tag, content in matches}
//     elif re.search(r'\s*\[.+?\]:', xml_string): # 如果是键值对
//         # 正则表达式：1. 匹配[xx]:的内容； 2. 匹配 [xx]: 之后的所有内容，直到下一个 [xx]: 、</xx>、或文本结束
//         matches = re.findall(r"\[(.+?)\]:\s*(.+?)(?=(\s*\[.+?\]:)|(\s*$)|(\s*</))", xml_string, flags=re.DOTALL)
//         return {tag.strip()+'|kv': xml_to_dict(content) 
//                     for tag, content, *_ in matches}
//     else: # 如果是普通单行，则返回空字符串（或处理为叶节点）
//         return xml_string.strip()

// def dict_filter(data, operations, level=0):
//     if isinstance(data, str):
//         return data
    
//     operation = operations.split(',')[level]

//     if operation[0] == '+':
//         if len(operation) == 1:
//             return {key: dict_filter(value, operations, level+1) for key, value in data.items()}
//         elif len(operation) > 1:
//             return {key: dict_filter(value, operations, level+1) for key, value in data.items() if key.split('|')[0] == operation[1:]}
//     if operation[0] == '-':
//         if len(operation) == 1:
//             li = [dict_filter(value, operations, level+1) for key, value in data.items()]
//             if isinstance(li[0], str) and operations.split(',')[-1] == 'concat':
//                 return ' '.join(li)
//         elif len(operation) > 1:
//             li = [dict_filter(value, operations, level+1) for key, value in data.items() if key.split('|')[0] == operation[1:]]
//             if len(li) == 1:
//                 li = li[0]
//         return li
    
// def dict_to_xml(data, level=0):
//     indent = '\t'*level
//     # print(data)
//     if isinstance(data, str):
//         return indent + data # 引进替代换行符，避免被concat合并误伤
//     elif isinstance(data, list):
//         return indent + indent.join(data) # 引进替代换行符，避免被concat合并误伤

//     xml_string = ""
//     for idx, (key, value) in enumerate(data.items()):
//         tag, tag_type = key.lstrip().split('|')
//         sub_content = dict_to_xml(value, level+1)
//         print(sub_content)
//         if tag_type == 'xml':
//             xml_string += f"{indent}<{tag}>\n{sub_content}\n{indent}</{tag}>\n"
//         elif tag_type == 'kv':
//             xml_string += f"{indent}[{tag}]:\n{sub_content}\n"
                
//     return xml_string

// def standardize_indentation(text):
//     lines = text.splitlines()
//     indents = set()

//     # 统计所有缩进量
//     for line in lines:
//         stripped_line = line.lstrip()
//         if stripped_line:  # 忽略空行
//             indent = len(line) - len(stripped_line)
//             indents.add(indent)

//     indents_map = {indent: ' '*i*4 for i, indent in enumerate(indents)}
    
//     # 标准化缩进
//     standardized_lines = []
//     for line in lines:        
//         stripped_line = line.lstrip()
//         if stripped_line:
//             indent = len(line) - len(stripped_line)
//             standardized_lines.append(indents_map[indent] + stripped_line)
    
//     return "\n".join(standardized_lines)

// from typing import List

// class XMLRequest(BaseModel):
//     xml: str
//     operations: str

// @app.api_route('/xml_reformat', methods=['POST'])
// def xml_reformat(xml, operations):
//     xml_string = req.xml
//     operations = req.operations

//     xml_dict = xml_to_dict(xml_string)
//     xml_dict = dict_filter(xml_dict, operations) # 去除、筛选某些层级
//     xml_string = dict_to_xml(xml_dict)
//     # xml_string = dict_to_xml(xml_dict, operations) # 去除、筛选某些层级
//     xml_string = standardize_indentation(xml_string) # 去除某些过度的缩进
//     xml_string = xml_string.replace('྾', '\n') # 把dict_to_xml这一步引进的替代换行符改回来
//     return xml_string

function merge_short_elements(lst) {
  let i = 0;
  while (i < lst.length) {
    if (lst[i].length <= 1) {
      if (i === 0) {
        // 只能合并到右边
        lst[i + 1] = lst[i] + lst[i + 1];
        lst.splice(i, 1);
      } else if (i === lst.length - 1) {
        // 只能合并到左边
        lst[i - 1] = lst[i - 1] + lst[i];
        lst.splice(i, 1);
        i--; // 回退索引，避免跳过元素
      } else {
        // 选择合并到较短的那个
        if (lst[i - 1].length <= lst[i + 1].length) {
          lst[i - 1] = lst[i - 1] + lst[i];
          lst.splice(i, 1);
          i--; // 回退索引，避免跳过元素
        } else {
          lst[i + 1] = lst[i] + lst[i + 1];
          lst.splice(i, 1);
        }
      }
    } else {
      i++;
    }
  }
  return lst;
}

function combine_articles(texts, languages, names, sentenceSegment) {
  // 当languages或者names只有一个元素时复制扩展到texts的长度
  if (languages.length === 1) {
    languages = new Array(texts.length).fill(languages[0]);
  }
  if (names.length === 1) {
    names = new Array(texts.length).fill(names[0]);
  }

  let newTexts = {};
  // 正则表达式匹配 <p_数字>...</p_数字>
  const pgPattern = /<p_(\d+)>\s*([\s\S]*?)\s*<\/p_\d+>/g;

  texts.forEach((text, idx) => {
    let language = languages[idx];
    // 使用 matchAll 遍历所有匹配结果
    for (const pg of text.matchAll(pgPattern)) {
      const pgIdx = parseInt(pg[1], 10);
      let content = pg[2].trim();
      if (!newTexts[pgIdx]) {
        newTexts[pgIdx] = [];
      }

      if (content.includes('<s_1>')) {
        // 正则匹配句子部分： <s_数字>...</s_数字>
        const sentenceRegex = /<(s_\d+)>(.*?)<\/\1>/gs;
        let matches = [];
        for (const m of content.matchAll(sentenceRegex)) {
          // m[1] 是标签，m[2] 是句子内容
          matches.push(m[2]);
        }
        content = matches;
      } else if (sentenceSegment) {
        // 假定存在 segment(language, content) 函数用于句子分割
        language = language.toLowerCase();
        content = segment(language, content);
        content = merge_short_elements(content);
      }
      newTexts[pgIdx].push(content);
    }
  });

  // versionNumber 在此处没被用到，仅记录版本数
  const versionNumber = names.length;
  let xml = '<article>\n';

  // 遍历每个段落，按照 pg_idx 的数字顺序排序
  Object.keys(newTexts)
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    .forEach(pgIdx => {
      const versions = newTexts[pgIdx];
      xml += `<p_${pgIdx}>\n`;

      if (sentenceSegment) {
        let numSentences = versions[0].length;
        // 检查所有版本的句子数量是否一致
        if (!versions.every(version => version.length === numSentences)) {
          // 将每个版本所有句子合并成一个句子
          for (let i = 0; i < versions.length; i++) {
            versions[i] = [versions[i].join(' ')];
          }
          numSentences = 1;
        }

        for (let sentIdx = 0; sentIdx < numSentences; sentIdx++) {
          xml += `\t[s_${sentIdx + 1}]:\n`;

          let versions_ = versions.map(version => version[sentIdx]);
          let names_ = names.slice();
          if (names_[0].length > 0) {
            if (new Set(names).size === 1) {
              // 如果所有版本的名称相同，则使用新的名称格式
              versions_ = Array.from(new Set(versions_));
              names_ = [];
              for (let i = 0; i < versions_.length; i++) {
                names_.push(`${names[0]}_${i + 1}`);
              }
            }
            for (let i = 0; i < Math.min(names_.length, versions_.length); i++) {
              xml += `\t\t[${names_[i]}]: ${versions_[i]}\n`;
            }
          } else {
            versions_.forEach(v_sent => {
              xml += `\t\t${v_sent}\n`;
            });
          }
        }
      } else {
        let names_ = names.slice();
        if (names_[0].length > 0) {
          for (let i = 0; i < Math.min(names_.length, versions.length); i++) {
            xml += `\t[${names_[i]}]: ${versions[i]}\n`;
          }
        } else {
          versions.forEach(v_sent => {
            xml += `\t\t${v_sent}\n`;
          });
        }
      }

      xml += `</p_${pgIdx}>\n`;
    });
  xml += '</article>';

  return xml;
}