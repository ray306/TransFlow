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

async function auto_request_something(step_idx, request_name, button_id, textarea_id) {
    document.getElementById(button_id).parentElement.scrollIntoView({ behavior: 'smooth',inline: 'start'});
    document.getElementById('notification').innerText = `Step ${step_idx}: request a response of ${request_name}...`

    await clickWithAwait(document.getElementById(button_id));
    if (document.getElementById(textarea_id).value == '') {
        document.getElementById('notification').innerText = `Step ${step_idx} failed.`
        throw new Error();
    }
    document.getElementById(textarea_id).parentElement.scrollIntoView({ behavior: 'smooth',inline: 'start'});
    document.getElementById('notification').innerText = `Step ${step_idx} done.`
}

async function auto_stage1() {
    document.getElementById('notification').innerText = 'STEP 1 is running...'

    await auto_request_something('1.1', 'online glossary', 'fetch_online_glossary', 'glossary');

    await auto_request_something('1.2', 'prompt', 'editor_prompt_button', 'annotation');

    document.getElementById('format_annotation').click();
    await sleep(500);
    document.getElementById('notification').innerText = 'Step 1 is done.'
}

async function auto_stage2() {
    document.getElementById('notification').innerText = 'STEP 2 is running...'

    await auto_request_something('2.1', 'machine translation', 'machine_translate', 'MT_article');

    document.getElementById('format_MT_article').click();
    await sleep(500);

    document.getElementById('auto_stage2').parentElement.parentElement.querySelectorAll('.copy_to_comparison')[0].click();

    document.getElementById('MT_article').parentElement.scrollIntoView({ behavior: 'smooth',inline: 'start'});
    
    await auto_request_something('2.2', 'prompt', 'prerevision_button', 'prerevision_article');

    document.getElementById('prerevision_article').parentElement.scrollIntoView({ behavior: 'smooth',inline: 'start'}); 
    document.getElementById('auto_stage2').parentElement.parentElement.querySelectorAll('.copy_to_comparison')[1].click();
    document.getElementById('notification').innerText = 'STEP2 is done.'
}

async function auto_stage3() {
    document.getElementById('notification').innerText = 'STEP 3 is running...';

    await auto_request_something('3.2', 'prompt', 'polish_preparation_button', 'polish_preparation');

    document.getElementById('extract_polishing_information').click();
    await sleep(500);

    await auto_request_something('3.5', 'prompt', 'polish_analysis_button', 'polished_article_analysis');

    document.getElementById('selectVersion').click();
    await sleep(500);

    document.getElementById('polished_article').parentElement.scrollIntoView({ behavior: 'smooth',inline: 'start'}); 
    document.getElementById('auto_stage3').parentElement.parentElement.querySelector('.copy_to_comparison').click();
    document.getElementById('notification').innerText = 'STEP3 is done.'
}

async function auto_stage4() {
    document.getElementById('notification').innerText = 'STEP 4 is running...'

    await auto_request_something('4.2', 'prompt', 'proof_button1', 'proofed_article_analysis');

    document.getElementById('construct_proofed_version').click();
    await sleep(500);
    document.getElementById('proofed_article').parentElement.scrollIntoView({ behavior: 'smooth',inline: 'start'}); 

    document.getElementById('auto_stage4').parentElement.parentElement.querySelector('.copy_to_comparison').click();
    
    document.getElementById('notification').innerText = 'STEP4 is done.'
    sound_alarm();
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