function yesNo(value) {
  return value ? 'yes' : 'no';
}

export function buildMarkdown(state) {
  const lines = [];
  lines.push(`# ${state.title}`);
  if (state.promise) lines.push('', `Working promise: ${state.promise}`);
  state.items.forEach((item, index) => {
    lines.push('', `## ${index + 1}. ${item.heading || 'Untitled heading'}`);
    if (item.beat) lines.push('', `Drop 2 beat line: ${item.beat}`);
    if (item.paragraph) lines.push('', 'Drop 3 paragraph plan:', '', item.paragraph);
    if (item.notes) lines.push('', 'Drop 4 tune notes:', '', item.notes);
    if (item.firstPage) lines.push('', 'Drop 5 first page:', '', item.firstPage);
    lines.push('', `Drop 3 checks: want ${yesNo(item.checks.want)}, pressure ${yesNo(item.checks.pressure)}, change ${yesNo(item.checks.change)}, consequence ${yesNo(item.checks.consequence)}.`);
  });
  return lines.join('\n');
}
