import re

with open('src/components/views/JadwalView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update table-layout for both
content = content.replace(
    'table { width: 100%; border-collapse: collapse; margin-bottom: 12px; position: relative; z-index: 2; }',
    'table { width: 100%; table-layout: fixed; border-collapse: collapse; margin-bottom: 12px; position: relative; z-index: 2; }'
)

# 2. Update renderRows for Rekap Tugas
# Remove NIP from the parameter type, empty colspan, and the td
old_render_tugas = """    const renderRows = (items: Array<{ name: string; school: string; nip?: string; gender?: string; info?: string }>) => {
      if (items.length === 0) {
        return `<tr><td colspan="6" style="text-align: center; padding: 6px; font-style: italic; color: #666; border: 1px solid #000;">Tidak ada data</td></tr>`;
      }
      return items.map((item, idx) => `
        <tr>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">${item.name}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px; font-family: monospace;">${item.nip || '-'}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${item.gender || '-'}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${item.school || '-'}</td>
          <td style="border: 1px solid #000; padding: 5px;">${item.info || '-'}</td>
        </tr>
      `).join('');
    };"""

new_render_tugas = """    const renderRows = (items: Array<{ name: string; school: string; gender?: string; info?: string }>) => {
      if (items.length === 0) {
        return `<tr><td colspan="5" style="text-align: center; padding: 6px; font-style: italic; color: #666; border: 1px solid #000;">Tidak ada data</td></tr>`;
      }
      return items.map((item, idx) => `
        <tr>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">${item.name}</td>
          <td style="text-align: center; border: 1px solid #000; padding: 5px;">${item.gender || '-'}</td>
          <td style="border: 1px solid #000; padding: 5px;">${item.school || '-'}</td>
          <td style="border: 1px solid #000; padding: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.info || '-'}</td>
        </tr>
      `).join('');
    };"""

content = content.replace(old_render_tugas, new_render_tugas)

# 3. Fix the mapping functions in handlePrintRekapTugas (remove nip mapping)
content = content.replace(
    'return { name: s.teacherName, nip: t?.nip, gender: t?.gender, school: s.teacherSchool, info: s.fileName };',
    'return { name: s.teacherName, gender: t?.gender, school: s.teacherSchool, info: s.fileName };'
)
content = content.replace(
    "return { name: s.teacherName, nip: t?.nip, gender: t?.gender, school: s.teacherSchool, info: s.rejectReason || 'File tidak sesuai' };",
    "return { name: s.teacherName, gender: t?.gender, school: s.teacherSchool, info: s.rejectReason || 'File tidak sesuai' };"
)
content = content.replace(
    "info: 'Belum mengunggah tugas' }))}",
    "info: 'Belum mengunggah tugas' }))}"
) # Need to catch the non-uploaders properly

content = content.replace(
    "return { name: t.name, nip: t.nip, gender: t.gender, school: t.school, info: 'Belum mengunggah tugas' }",
    "return { name: t.name, gender: t.gender, school: t.school, info: 'Belum mengunggah tugas' }"
)

# Replace the nonUploaders exact line
content = content.replace(
    "${renderRows(nonUploaders.map(t => ({ name: t.name, nip: t.nip, gender: t.gender, school: t.school, info: 'Belum mengunggah tugas' })))}",
    "${renderRows(nonUploaders.map(t => ({ name: t.name, gender: t.gender, school: t.school, info: 'Belum mengunggah tugas' })))}"
)


# 4. Update the headers in handlePrintRekapTugas
# Find the headers specifically for handlePrintRekapTugas
# Let's replace the whole blocks

old_tugas_headers = """              <th style="width: 4%;">No</th>
              <th style="width: 23%;">Nama Lengkap</th>
              <th style="width: 18%;">NIP</th>
              <th style="width: 5%;">L/P</th>
              <th style="width: 32%;">Asal Sekolah</th>
              <th style="width: 18%;">Nama File Tugas</th>"""

new_tugas_headers = """              <th style="width: 4%;">No</th>
              <th style="width: 30%;">Nama Lengkap</th>
              <th style="width: 5%;">L/P</th>
              <th style="width: 31%;">Asal Sekolah</th>
              <th style="width: 30%;">Nama File Tugas</th>"""

old_tugas_headers_2 = """              <th style="width: 4%;">No</th>
              <th style="width: 23%;">Nama Lengkap</th>
              <th style="width: 18%;">NIP</th>
              <th style="width: 5%;">L/P</th>
              <th style="width: 32%;">Asal Sekolah</th>
              <th style="width: 18%;">Alasan Ditolak</th>"""

new_tugas_headers_2 = """              <th style="width: 4%;">No</th>
              <th style="width: 30%;">Nama Lengkap</th>
              <th style="width: 5%;">L/P</th>
              <th style="width: 31%;">Asal Sekolah</th>
              <th style="width: 30%;">Alasan Ditolak</th>"""

old_tugas_headers_3 = """              <th style="width: 4%;">No</th>
              <th style="width: 23%;">Nama Lengkap</th>
              <th style="width: 18%;">NIP</th>
              <th style="width: 5%;">L/P</th>
              <th style="width: 32%;">Asal Sekolah</th>
              <th style="width: 18%;">Keterangan</th>"""

new_tugas_headers_3 = """              <th style="width: 4%;">No</th>
              <th style="width: 30%;">Nama Lengkap</th>
              <th style="width: 5%;">L/P</th>
              <th style="width: 31%;">Asal Sekolah</th>
              <th style="width: 30%;">Keterangan</th>"""

content = content.replace(old_tugas_headers, new_tugas_headers)
content = content.replace(old_tugas_headers_2, new_tugas_headers_2)
content = content.replace(old_tugas_headers_3, new_tugas_headers_3)

with open('src/components/views/JadwalView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

