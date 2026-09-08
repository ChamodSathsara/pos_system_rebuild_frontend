function printInBrowser(html: string) {
  return new Promise<void>((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.position = "fixed";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.style.visibility = "hidden";
    frame.onload = () => {
      try {
        const printWindow = frame.contentWindow;
        if (!printWindow) throw new Error("The browser print window could not be opened.");
        printWindow.focus();
        printWindow.print();
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        window.setTimeout(() => frame.remove(), 1_000);
      }
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}

export async function printReceipt(html: string, invoiceNo: string) {
  if (window.electronAPI?.isElectron) {
    const result = await window.electronAPI.printInvoice({ html, invoiceNo });
    if (!result.success) throw new Error(result.message || "The invoice could not be printed.");
    return;
  }

  await printInBrowser(html);
}
