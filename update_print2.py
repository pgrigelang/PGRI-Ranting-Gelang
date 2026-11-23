import re

with open('src/components/views/JadwalView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I will replace exactly the th blocks that include NIP within handlePrintRekapTugas.
# We know the first block has:
old_tugas_headers_1 = """              <th style="width: 4%;">No</th>
              <th style="width: 28%;">Nama Lengkap</th>
              <th style="width: 18%;">NIP</th>
              <th style="width: 5%;">L/P</th>
              <th style="width: 32%;">Asal Sekolah</th>
              <th style="width: 18%;">Nama File Tugas</th>"""

new_tugas_headers_1 = """              <th style="width: 4%;">No</th>
              <th style="width: 30%;">Nama Lengkap</th>
              <th style="width: 5%;">L/P</th>
              <th style="width: 31%;">Asal Sekolah</th>
              <th style="width: 30%;">Nama File Tugas</th>"""

old_tugas_headers_2 = """              <th style="width: 4%;">No</th>
              <th style="width: 28%;">Nama Lengkap</th>
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
              <th style="width: 28%;">Nama Lengkap</th>
              <th style="width: 18%;">NIP</th>
              <th style="width: 5%;">L/P</th>
              <th style="width: 32%;">Asal Sekolah</th>
              <th style="width: 18%;">Keterangan</th>"""

new_tugas_headers_3 = """              <th style="width: 4%;">No</th>
              <th style="width: 30%;">Nama Lengkap</th>
              <th style="width: 5%;">L/P</th>
              <th style="width: 31%;">Asal Sekolah</th>
              <th style="width: 30%;">Keterangan</th>"""

# I will only replace these blocks AFTER the "REKAPITULASI PENGUMPULAN TUGAS KEGIATAN" to avoid messing up Kehadiran again if there's any overlap (though unlikely)
idx = content.find("REKAPITULASI PENGUMPULAN TUGAS KEGIATAN")
if idx != -1:
    before = content[:idx]
    after = content[idx:]
    after = after.replace(old_tugas_headers_1, new_tugas_headers_1)
    after = after.replace(old_tugas_headers_2, new_tugas_headers_2)
    after = after.replace(old_tugas_headers_3, new_tugas_headers_3)
    content = before + after

with open('src/components/views/JadwalView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

