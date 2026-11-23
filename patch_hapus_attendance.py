import re

with open("src/components/views/JadwalView.tsx", "r") as f:
    content = f.read()

content = content.replace(
    '''} else {
                                if (onUpdateAttendance) onUpdateAttendance({...rec, status: 'Verifikasi'});
                                setToastMessage('Data dipindahkan ke Verifikasi');
                                setTimeout(() => setToastMessage(null), 3000);
                              }''',
    '''} else {
                                if (confirm('Apakah Anda yakin ingin memindahkan data ini kembali ke proses Verifikasi?')) {
                                  if (onUpdateAttendance) onUpdateAttendance({...rec, status: 'Verifikasi'});
                                  setToastMessage('Data dipindahkan ke Verifikasi');
                                  setTimeout(() => setToastMessage(null), 3000);
                                }
                              }'''
)

with open("src/components/views/JadwalView.tsx", "w") as f:
    f.write(content)
