export function splitProgramDescription(description) {
  const lines = String(description || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const detailLine = lines.find((line) => line.startsWith('상세 안내:'));
  const detailLink = detailLine
    ? detailLine.replace('상세 안내:', '').trim()
    : '';

  const summaryLines = lines.filter((line) => !line.startsWith('상세 안내:'));

  return {
    summary: summaryLines.join('\n').trim(),
    detailLink,
  };
}
