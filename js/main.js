import { ConvertPDF } from './convertPDF.js';

const printBtn = document.querySelector('.print-button');
const shareBtn = document.querySelector('.share-button');
const convertPDF = new ConvertPDF('.pdf-container', {
  on: {
    convertBefore() {
      console.log('轉換PDF之前，通常是用來跑loading的');
    },
    convertAfter() {
      console.log('轉換PDF之後，通常是用來跑loaded的');
    },
    save() {
      console.log('已存檔');
    },
    shared() {
      console.log('shared successfully');
      window.close();
    },
  },
  paddingY: 30, //每一頁上下內縮的距離(px)
});

printBtn.addEventListener('click', function () {
  convertPDF.init();
});

shareBtn.addEventListener('click', function () {
  convertPDF.share();
});
