import re

with open('src/components/views/JadwalView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix CSS in Kehadiran
content = content.replace(
    '.signature-img { max-height: 50px; object-fit: contain; position: relative; z-index: 1; }',
    '.signature-img { max-height: 50px; object-fit: contain; position: relative; z-index: 1; } .signature-name { font-weight: bold; text-decoration: underline; }'
)

# Fix date for Kehadiran
kehadiran_date_def = """    const todayFormatted = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });"""
kehadiran_date_new = """    const eventDateFormatted = targetEvt.date ? new Date(targetEvt.date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });"""
# The first occurrence is in handlePrintRekapKehadiran
content = content.replace(kehadiran_date_def, kehadiran_date_new, 1)

content = content.replace(
    '<p style="margin: 0;">Jember, ${todayFormatted}</p>',
    '<p style="margin: 0;">Jember, ${eventDateFormatted}</p>',
    1
)

# Fix date for Tugas
content = content.replace(kehadiran_date_def, kehadiran_date_new, 1) # now the second occurrence

content = content.replace(
    '<p style="margin: 0;">Jember, ${todayFormatted}</p>',
    '<p style="margin: 0;">Jember, ${eventDateFormatted}</p>',
    1
)

with open('src/components/views/JadwalView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

