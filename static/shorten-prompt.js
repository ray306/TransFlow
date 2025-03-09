// remove all the xml labels and their content that the labels are finished with a number that is not between start and end
function select_sections(prompt, start, end) {
    // Function to check if a number is outside the selected range
    const isOutsideRange = (number, rangeStart, rangeEnd) => {
        return number < rangeStart || number > rangeEnd;
    };

    // find level2 XML tags
    const regex = /<(.*?_)(\d+)>(.*?)<\/\1\2>/gs;

    let new_prompt = prompt.replace(regex, function(match, p1, p2, p3, offset, string) {
        // p1 is the tag name, p2 is the number part of the tag, and p3 is the content between the tags
        let tagNumber = parseInt(p2, 10);
        if (isOutsideRange(tagNumber, start, end)) {
            return ''; // Remove the tag and its content
        } else {
            return match; // Keep the tag and its content
        }
    });

    new_prompt = new_prompt.replace(/`<p_1>`->`<p_.*?>`/ug, `\`<p_${start}>\`->\`<p_${end}>\``);

    // 使用正则表达式将超过两个连续的换行符替换为两个连续换行符
    new_prompt = new_prompt.replace(/\n{2,}/g, "\n\n");

    return new_prompt;
};

function shorten_prompt(prompt, start, limit) {
    length = 0;
    let paragraphs = prompt.match(/<p_\d*?>.*?<\/p_\d*?>/gs);
    let paragraphs_char_count = paragraphs.reduce((totalLength, str) => totalLength + str.length, 0);
    limit = limit - (prompt.length - paragraphs_char_count);
    
    for (paragraph of paragraphs) {
        idx = parseInt(paragraph.match(/\d+/g)[0]);
        if (idx >= start) {
            length += paragraph.length;
            if (length > limit) {
                end = idx - 1;
                new_start = end + 1;
                break
            }
            else {
                end = idx;
                new_start = -1;
            }
        }
    }
    console.log('start end',start,end);
    console.log('new_start', new_start)

    new_prompt = select_sections(prompt, start, end);

    completion_mark = `<\/p_${end}>`;
    return [new_prompt, new_start, completion_mark];
} 