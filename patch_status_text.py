import re

with open("src/components/views/JadwalView.tsx", "r") as f:
    content = f.read()

content = content.replace(
    '''                      }`}>
                        {rec.status}
                      </span>''',
    '''                      }`}>
                        {rec.status === 'Verifikasi' ? 'Belum Diverifikasi' : rec.status}
                      </span>'''
)

with open("src/components/views/JadwalView.tsx", "w") as f:
    f.write(content)
