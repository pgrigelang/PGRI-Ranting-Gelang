export const safeDownloadBlob = async (blob: Blob, filename: string) => {
  return new Promise<void>((resolve, reject) => {
    try {
      // Deteksi jika aplikasi berjalan di dalam WebView (seperti Median.co / GoNative)
      // WebView sering memblokir Blob URL dan menggantung (hang) pada navigator.share
      const isWebView = typeof window !== 'undefined' && (
        (window as any).median != null || 
        (window as any).gonative != null || 
        /wv/i.test(navigator.userAgent) ||
        /gonative|median/i.test(navigator.userAgent) ||
        (/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent)) ||
        (/Android.*Version\/[0-9].[0-9].*Chrome\/[0-9].*Mobile/i.test(navigator.userAgent))
      );

      // Jika di WebView (Median.co), gunakan Data URL (Base64) karena Median mendeteksi
      // link Data URL dan mengaktifkan fitur Native Download Manager milik Android.
      if (isWebView) {
        const reader = new FileReader();
        reader.onloadend = () => {
          try {
            const dataUrl = reader.result as string;
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            resolve();
          } catch (e) {
            reject(e);
          }
        };
        reader.onerror = () => reject(new Error("Gagal mengonversi data unduhan"));
        reader.readAsDataURL(blob);
        return;
      }

      // Untuk Browser Standar (Chrome, Safari, Edge) — Unduh langsung ke perangkat tanpa memicu menu Share
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
      resolve();

    } catch (err) {
      console.error("Kesalahan kritis di safeDownloadBlob:", err);
      resolve(); // Tetap resolve agar UI tidak macet selamanya
    }
  });
};
