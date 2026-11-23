import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Pattern for pdf (html2pdf)
    pattern_pdf = re.compile(
        r"const pdfBlob = await html2pdf\(\)\.set\(opt\)\.from\(container\)\.outputPdf\('blob'\);\s*"
        r"const file = new File\(\[pdfBlob\], opt\.filename, \{ type: 'application/pdf' \}\);\s*"
        r"if \(navigator\.canShare && navigator\.canShare\(\{ files: \[file\] \}\)\) \{\s*"
        r"await navigator\.share\(\{ files: \[file\], title: opt\.filename \}\);\s*"
        r"\} else \{\s*"
        r"const blobUrl = URL\.createObjectURL\(pdfBlob\);\s*"
        r"const link = document\.createElement\('a'\);\s*"
        r"link\.href = blobUrl;\s*"
        r"link\.download = opt\.filename;\s*"
        r"document\.body\.appendChild\(link\);\s*"
        r"link\.click\(\);\s*"
        r"document\.body\.removeChild\(link\);\s*"
        r"URL\.revokeObjectURL\(blobUrl\);\s*"
        r"\}\s*"
        r"document\.body\.removeChild\(container\);",
        re.MULTILINE
    )

    replacement_pdf = """const pdfBlob = await html2pdf().set(opt).from(container).outputPdf('blob');
        await safeDownloadBlob(pdfBlob, opt.filename);
      } catch (err) {
        console.error('Gagal mengunduh PDF di ponsel:', err);
      } finally {
        if (container && document.body.contains(container)) {
          document.body.removeChild(container);
        }
      }"""

    # We need to replace the error catching to include finally block
    # Let's adjust the regex to match up to the catch block because we need to insert finally
    
    # Let's use a simpler string replace since the block is identical.
    block_to_replace = """        const pdfBlob = await html2pdf().set(opt).from(container).outputPdf('blob');
        const file = new File([pdfBlob], opt.filename, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: opt.filename });
        } else {
          const blobUrl = URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = opt.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }
        document.body.removeChild(container);
      } catch (err) {
        console.error('Gagal mengunduh PDF di ponsel:', err);
      }"""

    new_block = """        const pdfBlob = await html2pdf().set(opt).from(container).outputPdf('blob');
        await safeDownloadBlob(pdfBlob, opt.filename);
      } catch (err) {
        console.error('Gagal mengunduh PDF di ponsel:', err);
      } finally {
        if (container && document.body.contains(container)) {
          document.body.removeChild(container);
        }
      }"""

    if block_to_replace in content:
        content = content.replace(block_to_replace, new_block)
        print(f"Replaced PDF block in {filepath}")
    else:
        print(f"PDF Block not found in {filepath}")
        
    with open(filepath, 'w') as f:
        f.write(content)

process_file('src/components/views/AnggotaView.tsx')
process_file('src/components/views/KeuanganView.tsx')
process_file('src/components/views/JadwalView.tsx')
