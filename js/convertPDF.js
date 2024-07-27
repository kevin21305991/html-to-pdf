export class ConvertPDF {
  constructor(element, params) {
    this.pdfContainer = document.querySelector(element);
    this.allPDFWrap = this.pdfContainer.querySelectorAll('[pdf-wrap]');
    this.pdf = new window.jspdf.jsPDF({
      unit: 'pt',
      format: 'a4',
      encryption: {
        userPermissions: ['print'],
      },
    });
    //PDF尺寸(A4)
    this.pdfSizes = {
      a4W: 595.28,
      a4H: 841.89,
    };
    // default params
    const defaultOptions = {
      on: {
        convertBefore() {},
        convertAfter() {},
        save() {},
        shared() {},
      },
      paddingY: 0,
      autoPrint: false,
    };
    const mergeOptions = (target, source) => {
      const merged = { ...target };
      for (let key of Object.keys(source)) {
        if (typeof source[key] === 'object' && key in target) {
          merged[key] = mergeOptions(target[key], source[key]);
        } else {
          merged[key] = source[key];
        }
      }
      return merged;
    };
    this.options = mergeOptions(defaultOptions, params);
  }
  /**
   * 將數字格式化到小數點第N位
   * @param {number} number 格式化前的數字
   * @param {number} decimal 欲取得小數點後第幾位
   * @returns
   */
  #formatFloat(number, decimal) {
    return parseFloat(number.toFixed(decimal));
  }

  /**
   * 儲存PDF
   * @param {string} pdfName 輸出的PDF檔案名稱
   */
  #savePDF(pdfName) {
    const _this = this;
    // 打開PDF時自動開啟列印視窗
    if (_this.options.autoPrint) {
      _this.pdf.autoPrint({ variant: 'non-conform' });
    }
    _this.pdf.save(`${pdfName}.pdf`);
    _this.options.on.save();
  }

  /**
   * 將Canvas轉成file
   * @param {object} canvas 需要轉換成檔案的canvas
   * @param {string} fileName 轉換後的檔名
   */
  #convertToFile(canvas, fileName) {
    const _this = this;
    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height + _this.options.paddingY * 2;
    const newCanvasCtx = newCanvas.getContext('2d');
    newCanvasCtx.fillStyle = '#ffffff';
    newCanvasCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    newCanvasCtx.drawImage(canvas, 0, _this.options.paddingY);
    const link = document.createElement('a');
    link.download = fileName;
    link.href = newCanvas.toDataURL();
    link.click();
    // newCanvas.toBlob(
    //   async function (blob) {
    //     const file = new File([blob], `${fileName}.jpeg`, { type: 'image/jpeg' });
    //     let shareData = {
    //       files: [file],
    //     };
    //     const aLink = document.createElement('a')
    //     aLink.href =
    //     // try {
    //     //   if (!navigator.canShare(shareData)) return;
    //     //   await navigator.share(shareData);
    //     //   await _this.options.on.shared();
    //     // } catch (err) {
    //     //   console.log(`Error: ${err}`);
    //     // }
    //   },
    //   'image/jpeg',
    //   1,
    // );
  }

  /**
   * 產生PDF頁面
   * @param {object} element [pdf-wrap]
   * @param {object} PDFWrapSize 整個頁面的寬高
   * @param {object} canvas HTML轉換的Canvas
   * @param {object} pageROW 所有的 [pdf-content]
   */
  #generatePDFPage(element, PDFWrapSize, canvas, pageROW) {
    const _this = this;
    let totalHeight = 0;
    let now = 1;
    let pageCounts = 1;
    const { a4W, a4H } = _this.pdfSizes;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const page = document.createElement('canvas');
    const pageCtx = page.getContext('2d', { willReadFrequently: true });
    // 要固定顯示在每一頁的開頭
    const PDFHeader = element.querySelector('[pdf-header]');
    const PDFHeaderH = _this.#formatFloat(PDFHeader.getBoundingClientRect().height, 2);
    const PDFHeaderStartY = _this.#formatFloat(PDFHeader.getBoundingClientRect().top - element.getBoundingClientRect().top, 2);
    const PDFHeaderImageData = ctx.getImageData(0, PDFHeaderStartY, canvas.width, PDFHeaderH);
    page.width = canvas.width;
    page.height = canvas.width / (a4W / a4H);
    while (totalHeight < PDFWrapSize.height) {
      let H = pageCounts > 1 ? PDFHeaderH : 0;
      for (let i = now; i <= pageROW.length; i++) {
        now = i;
        H += _this.#formatFloat(pageROW[i - 1].getBoundingClientRect().height, 2);
        if (H > page.height - _this.options.paddingY * 2) {
          H -= _this.#formatFloat(pageROW[i - 1].getBoundingClientRect().height, 2);
          if (now === pageROW.length) {
            now--;
          }
          break;
        }
      }
      // 如果超過一頁要再扣掉表頭的高度
      if (pageCounts > 1) {
        H -= PDFHeaderH;
      }
      pageCtx.clearRect(0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, totalHeight, canvas.width, _this.#formatFloat(H, 2));
      if (pageCounts > 1) {
        pageCtx.putImageData(PDFHeaderImageData, 0, _this.options.paddingY);
        pageCtx.putImageData(imageData, 0, _this.options.paddingY + PDFHeaderH);
      } else {
        pageCtx.putImageData(imageData, 0, _this.options.paddingY);
      }
      pageCtx.globalCompositeOperation = 'destination-over';
      pageCtx.fillStyle = '#ffffff';
      pageCtx.fillRect(0, 0, page.width, page.height);
      let pageData = page.toDataURL('image/jpeg', 1.0);
      _this.pdf.addImage(pageData, 'JPEG', 0, 0, a4W, a4H);
      totalHeight += H;
      if (totalHeight < PDFWrapSize.height) {
        if (now < pageROW.length) {
          pageCounts++;
          _this.pdf.addPage();
        } else {
          break;
        }
      }
    }
  }

  /**
   * 產生Canvas
   * @param {object} element [pdf-wrap]
   */
  async #createCanvas(element, forShare) {
    const _this = this;
    const pdfName = element.getAttribute('pdf-name');
    const PDFWrapWidth = _this.#formatFloat(element.clientWidth, 2);
    const PDFWraptHeight = _this.#formatFloat(element.clientHeight, 2);
    const PDFWrapSize = { width: PDFWrapWidth, height: PDFWraptHeight };
    const pageROW = element.querySelectorAll('[pdf-content]');
    const html2canvasOptions = {
      logging: true,
      letterRendering: 1,
      backgroundColor: '#ffffff',
      width: PDFWrapSize.width,
      height: PDFWrapSize.height,
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
      x: (window.innerWidth - _this.pdfContainer.clientWidth) / 2 <= 0 ? 0 : (window.innerWidth - _this.pdfContainer.clientWidth) / 2,
      y: element.offsetTop,
      scale: 1,
    };
    await html2canvas(element, html2canvasOptions).then(canvas => {
      if (forShare) {
        _this.#convertToFile(canvas, pdfName);
      } else {
        _this.#generatePDFPage(element, PDFWrapSize, canvas, pageROW);
        _this.options.on.convertAfter();
        _this.#savePDF(pdfName);
      }
    });
  }

  /**
   * 初始化
   */
  init(forShare = false) {
    const _this = this;
    _this.options.on.convertBefore();
    _this.allPDFWrap.forEach(element => {
      _this.#createCanvas(element, forShare);
    });
  }

  /**
   * 分享圖片
   */
  share() {
    this.init(true);
  }
}
