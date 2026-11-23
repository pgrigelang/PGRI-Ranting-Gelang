import re

with open('src/components/views/JadwalView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_code = """    const eventDateFormatted = targetEvt.date ? new Date(targetEvt.date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });"""

new_code = """    const eventDateFormatted = targetEvt.fullDate 
      ? (targetEvt.fullDate.split(', ')[1] || targetEvt.fullDate) 
      : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });"""

content = content.replace(old_code, new_code)

with open('src/components/views/JadwalView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

