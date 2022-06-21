const { formatArguments } = require('./usage');
const { pad } = require('../util/utility');

function escape(content) {
    return content.replaceAll('`', '`\u200b').replaceAll('@', '@\u200b');
}

module.exports.escape = escape;
module.exports.generateText = function (split, args, obj) {
    let argumentLine = '| ';
    let syntaxLine = '| ';
    const syntax = formatArguments(args);

    let providedIdx = 0;

    for (let syntaxIdx = 0; syntaxIdx < syntax.length; syntaxIdx++) {
        const consumedInput = obj.consumeContext[syntaxIdx] ?? 'CONS';

        const providedArg = consumedInput === 'CONS' ? (split[providedIdx]?.value ?? '') : consumedInput;
        const syntaxArg = syntax[syntaxIdx] ?? '';

        const requiredLength = Math.max(providedArg.length, syntaxArg.length);

        argumentLine += providedArg + ' '.repeat(requiredLength - providedArg.length) + '    ';
        syntaxLine += syntaxArg + ' '.repeat(requiredLength - syntaxArg.length) + '    ';

        if (consumedInput === 'CONS') {
            providedIdx += 1;
        }
    }

    for (; providedIdx < split.length; providedIdx++) {
        argumentLine += split[providedIdx].value;
    }


    const send = `Error for overload
    ${escape(argumentLine)}
    ${escape(syntaxLine)}

${escape(pad(obj.reason, '    '))}`;

    return send;
};
