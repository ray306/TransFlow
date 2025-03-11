// const ele_only_for_automation = document.createElement('textarea');
// ele_only_for_automation.id = "ele_only_for_automation";
// ele_only_for_automation.style = 'display: none';
// document.body.appendChild(ele_only_for_automation);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const clickWithAwait = async (element) => {
    // 触发点击并等待事件处理完成
    const event = new Event('click');
    element.dispatchEvent(event);
    if (event.promise) {
        await event.promise;
    }
};

async function auto_stage1() {
    document.getElementById('notification').innerText = 'Step 1.1 fetching online glossary...'
    await clickWithAwait(document.getElementById('fetch_online_glossary'));
    // await document.getElementById('fetch_online_glossary').click();
    if (document.getElementById('glossary').value == '') {
        document.getElementById('notification').innerText = 'Step 1.1 failed.'
        throw new Error();
    }
    document.getElementById('glossary').parentElement.scrollIntoView({ behavior: 'smooth',inline: 'start'});
    document.getElementById('notification').innerText = 'Step 1.1 online glossary fetched'

    document.getElementById('notification').innerText = 'Step 1.2 sending prompt...'
    document.getElementById('editor_prompt').parentElement.scrollIntoView({ behavior: 'smooth',inline: 'start'}); 
    await clickWithAwait(document.getElementById('editor_prompt_button'));
    document.getElementById('notification').innerText = 'Step 1.2 prompt responsed'

    if (document.getElementById('annotation').value == '') {
        document.getElementById('notification').innerText = 'Step 1.2 failed.'
        throw new Error();
    }
    document.getElementById('annotation').parentElement.scrollIntoView({ behavior: 'smooth',inline: 'start'}); 

    document.getElementById('format_annotation').click();
    await sleep(500);

    document.getElementById('notification').innerText = 'Step 1.4 annotation formatted'
}

async function auto_stage2() {
    document.getElementById('notification').innerText = 'STEP 2 is running...'

    document.getElementById('notification').innerText = 'Step 2.1 translating...'
    await clickWithAwait(document.getElementById('machine_translate'));
    if (document.getElementById('MT_article').value == '') {
        document.getElementById('notification').innerText = 'Step 2.1 failed.'
        throw new Error();
    }
    document.getElementById('notification').innerText = 'Step 2.1 translated...'
    document.getElementById('format_MT_article').click();
    await sleep(500);
    document.getElementById('auto_stage2').parentElement.parentElement.querySelectorAll('.copy_to_comparison')[0].click();

    document.getElementById('MT_article').parentElement.scrollIntoView({ behavior: 'smooth',inline: 'start'});
    document.getElementById('notification').innerText = 'Step 2.2 sending prompt...'

    await clickWithAwait(document.getElementById('prerevision_button'));
    if (document.getElementById('prerevision_article').value == '') {
        document.getElementById('notification').innerText = 'Step 2.2 failed.'
        throw new Error();
    }

    document.getElementById('auto_stage2').parentElement.parentElement.querySelectorAll('.copy_to_comparison')[1].click();
    document.getElementById('prerevision_article').parentElement.scrollIntoView({ behavior: 'smooth',inline: 'start'}); 
    document.getElementById('notification').innerText = 'STEP2 is done.'
}

async function auto_stage3() {
    document.getElementById('notification').innerText = 'STEP 3 is running...';
    document.getElementById('notification').innerText = 'Step 3.2 sending prompt...'

    await clickWithAwait(document.getElementById('polish_preparation_button'));
    if (document.getElementById('polish_preparation').value == '') {
        document.getElementById('notification').innerText = 'Step 3.2 failed.'
        throw new Error();
    }
    document.getElementById('polish_preparation').parentElement.scrollIntoView({ behavior: 'smooth',inline: 'start'}); 

    document.getElementById('extract_polishing_information').click();
    await sleep(500);

    document.getElementById('notification').innerText = 'Step 3.5 sending prompt...'

    await clickWithAwait(document.getElementById('polish_analysis_button'));
    if (document.getElementById('polished_article_analysis').value == '') {
        document.getElementById('notification').innerText = 'Step 3.5 failed.'
        throw new Error();
    }
    document.getElementById('polished_article_analysis').parentElement.scrollIntoView({ behavior: 'smooth',inline: 'start'}); 

    document.getElementById('selectVersion').click();
    await sleep(500);

    document.getElementById('auto_stage3').parentElement.parentElement.querySelector('.copy_to_comparison').click();
    document.getElementById('polished_article').parentElement.scrollIntoView({ behavior: 'smooth',inline: 'start'}); 
    document.getElementById('notification').innerText = 'STEP3 is done.'
}

async function auto_stage4() {
    document.getElementById('notification').innerText = 'STEP 4 is running...'
    document.getElementById('notification').innerText = 'Step 4.2 sending prompt...'
    await clickWithAwait(document.getElementById('proof_button1'));
    if (document.getElementById('proofed_article_analysis').value == '') {
        document.getElementById('notification').innerText = 'Step 4.2 failed.'
        throw new Error();
    }
    document.getElementById('proofed_article_analysis').parentElement.scrollIntoView({ behavior: 'smooth',inline: 'start'}); 

    document.getElementById('construct_proofed_version').click();
    await sleep(500);

    document.getElementById('auto_stage4').parentElement.parentElement.querySelector('.copy_to_comparison').click();
    document.getElementById('proofed_article').parentElement.scrollIntoView({ behavior: 'smooth',inline: 'start'}); 
    sound_alarm();
    document.getElementById('notification').innerText = 'STEP4 is done.'
}

document.getElementById('auto_stage1').addEventListener('click', async function() {
    auto_stage1();
});

document.getElementById('auto_stage2').addEventListener('click', async function() {
    auto_stage2();
});

document.getElementById('auto_stage3').addEventListener('click', async function() {
    auto_stage3();
});

document.getElementById('auto_stage4').addEventListener('click', async function() {
    auto_stage4();
});

document.getElementById('auto_stage_all').addEventListener('click', async function() {
    // switch_slide('next');
    document.getElementById("slide1_pointer").click();
    await auto_stage1();
    // switch_slide('next');
    document.getElementById("slide2_pointer").click();
    await auto_stage2();
    // switch_slide('next');
    document.getElementById("slide3_pointer").click();
    await auto_stage3();
    // switch_slide('next');
    document.getElementById("slide4_pointer").click();
    await auto_stage4();

});