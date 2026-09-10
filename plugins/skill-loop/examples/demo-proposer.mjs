// Prepared teaching correction. The actual Humanizer already describes both dash types.
let input='';for await(const chunk of process.stdin)input+=chunk;JSON.parse(input);
process.stdout.write(JSON.stringify({text:'Humanizer punctuation practice: replace em dashes and en dashes with commas, removing adjacent spaces. Return JSON with text. Teaching adaptation, not the full Humanizer skill.',evidence:'Humanizer 2.9.1 §14 covers both dash types. This prepared correction fixes the deliberately limited adaptation; it is not autonomous research or a discovered flaw in the installed skill.'}));
