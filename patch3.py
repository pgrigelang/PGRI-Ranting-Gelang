import re

with open("src/components/views/JadwalView.tsx", "r") as f:
    content = f.read()

pattern = re.compile(r"  const getCountdownText = \(deadlineStr: string\) => \{.*?return `\$\{pad\(hours\)\}\.\$\{pad\(minutes\)\}\.\$\{pad\(seconds\)\}`;", re.DOTALL)

replacement = """  const getCountdownText = (deadlineStr: string) => {
    if (!deadlineStr) return '00.00.00';

    let deadlineDate: Date;
    if (deadlineStr.includes('/')) {
      const parts = deadlineStr.split('/');
      if (parts.length === 3) {
        deadlineDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T23:59:59`);
      } else {
        return '00.00.00';
      }
    } else {
      deadlineDate = new Date(deadlineStr + 'T23:59:59');
    }

    const diff = deadlineDate.getTime() - currentTime.getTime();

    if (isNaN(diff) || diff <= 0) {
      return '00.00.00';
    }

    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number) => String(num).padStart(2, '0');
    return `${pad(hours)}.${pad(minutes)}.${pad(seconds)}`;"""

new_content = pattern.sub(replacement, content)

with open("src/components/views/JadwalView.tsx", "w") as f:
    f.write(new_content)

print(content != new_content)
