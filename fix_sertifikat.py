filepath = 'src/components/views/SertifikatView.tsx'
with open(filepath, 'r') as f:
    content = f.read()

bad_block1 = """        const pdfBlob = await html2pdf().set(opt).from(container).outputPdf('blob');
        await safeDownloadBlob(pdfBlob, opt.filename);
      } catch (err) {
        console.error('Gagal mengunduh PDF di ponsel:', err);
      } finally {
        if (container && document.body.contains(container)) {
          document.body.removeChild(container);
        }
      } catch (err) {
        console.error('Gagal mengunduh piagam di ponsel:', err);
      }"""

good_block1 = """        const pdfBlob = await html2pdf().set(opt).from(container).outputPdf('blob');
        await safeDownloadBlob(pdfBlob, opt.filename);
      } catch (err) {
        console.error('Gagal mengunduh piagam di ponsel:', err);
      } finally {
        if (container && document.body.contains(container)) {
          document.body.removeChild(container);
        }
      }"""

if bad_block1 in content:
    content = content.replace(bad_block1, good_block1)
else:
    print("bad_block1 not found!")
    
with open(filepath, 'w') as f:
    f.write(content)
