// Imágenes del diseño original (Claude Design). Las claves coinciden con las del export.
import r0_vita_shade_jpg from "./assets/img/vita-shade.jpg";
import r1_inventario_jpg from "./assets/img/inventario.jpg";
import r2_macroestetica_jpg from "./assets/img/macroestetica.jpg";
import r3_proporciones_jpg from "./assets/img/proporciones.jpg";
import r4_arco_sonrisa_jpg from "./assets/img/arco-sonrisa.jpg";
import r5_gingival_jpg from "./assets/img/gingival.jpg";
import r6_app_step1_png from "./assets/img/app-step1.jpg";
import r7_app_step2_jpg from "./assets/img/app-step2.jpg";
import r8_app_step3_jpg from "./assets/img/app-step3.jpg";
import r9_app_step4_jpg from "./assets/img/app-step4.jpg";
import r10_analysis_blur_png from "./assets/img/analysis-blur.webp";
import r11_logo_sf_white_png from "./assets/img/logo-sf-white.png";
import r12_logo_sf_black_png from "./assets/img/logo-sf-black.png";
import r14_trans_1_before_jpg from "./assets/img/trans-1-before.jpg";
import r15_trans_1_after_jpg from "./assets/img/trans-1-after.jpg";
import r16_preview_before_png from "./assets/img/preview-before.webp";
import r17_preview_after_png from "./assets/img/preview-after.jpg";
import r18_logo_nobel_jpg from "./assets/img/logo-nobel.jpg";
import r19_logo_bracamonte_png from "./assets/img/logo-bracamonte.png";
import r20_logo_templo_png from "./assets/img/logo-templo.png";
import r21_logo_remax_png from "./assets/img/logo-remax.png";
import r22_logo_sanjose_png from "./assets/img/logo-sanjose.png";
import r23_logo_innovacirco_png from "./assets/img/logo-innovacirco.png";
import r24_avatar_josemiguel_jpg from "./assets/img/avatar-josemiguel.jpg";
import r25_brandboost_mark_png from "./assets/img/brandboost-mark.png";
import r26_cta_smile_jpg from "./assets/img/cta-smile.jpg";
import r27_trans_2_before_jpg from "./assets/img/trans-2-before.jpg";
import r28_trans_2_after_jpg from "./assets/img/trans-2-after.jpg";

export const RES = {
  r0_vita_shade_jpg: r0_vita_shade_jpg,
  r1_inventario_jpg: r1_inventario_jpg,
  r2_macroestetica_jpg: r2_macroestetica_jpg,
  r3_proporciones_jpg: r3_proporciones_jpg,
  r4_arco_sonrisa_jpg: r4_arco_sonrisa_jpg,
  r5_gingival_jpg: r5_gingival_jpg,
  r6_app_step1_png: r6_app_step1_png,
  r7_app_step2_jpg: r7_app_step2_jpg,
  r8_app_step3_jpg: r8_app_step3_jpg,
  r9_app_step4_jpg: r9_app_step4_jpg,
  r10_analysis_blur_png: r10_analysis_blur_png,
  r11_logo_sf_white_png: r11_logo_sf_white_png,
  r12_logo_sf_black_png: r12_logo_sf_black_png,
  r14_trans_1_before_jpg: r14_trans_1_before_jpg,
  r15_trans_1_after_jpg: r15_trans_1_after_jpg,
  r16_preview_before_png: r16_preview_before_png,
  r17_preview_after_png: r17_preview_after_png,
  r18_logo_nobel_jpg: r18_logo_nobel_jpg,
  r19_logo_bracamonte_png: r19_logo_bracamonte_png,
  r20_logo_templo_png: r20_logo_templo_png,
  r21_logo_remax_png: r21_logo_remax_png,
  r22_logo_sanjose_png: r22_logo_sanjose_png,
  r23_logo_innovacirco_png: r23_logo_innovacirco_png,
  r24_avatar_josemiguel_jpg: r24_avatar_josemiguel_jpg,
  r25_brandboost_mark_png: r25_brandboost_mark_png,
  r26_cta_smile_jpg: r26_cta_smile_jpg,
  r27_trans_2_before_jpg: r27_trans_2_before_jpg,
  r28_trans_2_after_jpg: r28_trans_2_after_jpg,
};

// El badge de Brandboost (script clásico) lee window.__resources.
if (typeof window !== "undefined") {
  window.__resources = Object.assign(window.__resources || {}, RES);
}
