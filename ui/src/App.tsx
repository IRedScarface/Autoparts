import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Upload, Package, Rocket, Wand2, FileText, Link2, Download, Info, Sparkles, Files, Languages, Globe, Moon } from 'lucide-react'
import ReactFlow, { Background, Controls, MiniMap, Node, Edge } from 'reactflow'
import 'reactflow/dist/style.css'

// --- i18n ---
type Lang = 'tr' | 'en' | 'de' | 'fr' | 'es' | 'ru' | 'ar' | 'zh' | 'ja'
const dict: Record<Lang, Record<string, string>> = {
  tr: {
    appTitle: 'autoparts UI',
    files: 'Dosyalar',
    pickHelp: 'Bir veya birden fazla .py dosyası seçebilirsin.',
    selectedCount: 'dosya seçildi',
    plan: 'Planla',
    planning: 'Planlanıyor…',
    build: 'Paketi Oluştur',
    building: 'Paketleniyor…',
    downloadZip: "ZIP'i indir",
    downloadPkgs: "packages.zip'i indir",
    settings: 'Ayarlar',
    compact: 'Kompaktlık düzeyi (modül azaltma)',
    compactHelp: 'Modül sayısını otomatik azaltır: 0=Kapalı, 1=Az, 2=Orta (önerilen), 3=Agresif.',
    compactOffLabel: 'Kapalı',
    compactLowLabel: 'Az',
    compactMedLabel: 'Orta',
    compactHighLabel: 'Agresif',
    recommended: '(önerilir)',
    packSmall: 'Küçük modülleri birleştir (satır eşiği)',
    packSmallHelp: "Bu satır sayısından küçük modüller 'core' içinde birleştirilir. Örn: 120.",
    maxModules: 'En fazla modül sayısı',
    maxModulesHelp: 'Toplam modül sayısı bu sınırı aşarsa en küçük modüller birleştirilir (constants/core hariç).',
    minLines: 'Modül başına minimum satır',
    minLinesHelp: 'Bu eşiğin altındaki modüller başka modüllerle kaynaştırılır. Örn: 80.',
    targetMods: 'Hedef modül sayısı',
    targetModsHelp: 'Mümkünse modül sayısı buraya kadar düşürülür. Boşsa kapalıdır.',
    aiName: 'Yapay zekâ ile paket adı öner',
    aiNameHelp: 'Docstring ve üst düzey isimlere göre Ollama modelinden isim önerir.',
    ollamaUrl: 'Ollama URL',
    ollamaUrlHelp: 'Yerel: http://localhost:11434',
    ollamaModel: 'Ollama Modeli',
    ollamaModelHelp: 'Örn: gpt-oss:20b, mistral, llama3',
    aiEdit: 'Yapay zekâ ile düzenle',
    aiEditHelp: 'Tek dosya düzenler veya çoklu seçimde bir ZIP döndürür.',
    chooseFile: 'Dosya seç',
    editPreview: 'Düzenleme Önizlemesi',
    instruction: 'Talimat',
    instrPlaceholder: "Örn: Docstring ekle, tip ipuçlarını tamamla ve kullanılmayan importları kaldır.",
    langForAI: 'Açıklama dili (AI)',
    langForAIHelp: 'Docstring/yorum dili. Kod çalışmasını etkilemez.',
    aiEditing: 'Düzenleniyor…',
    aiEditDo: 'AI ile düzenle',
    dlEdited: 'Düzenlenen dosyayı indir',
    after: 'Sonrası (AI)',
    depGraph: 'Bağımlılık Grafiği',
    aiPkgName: 'AI Paket Adı',
    pkgNameGen: 'Docstring ve üst düzey isimlere göre oluşturulur.',
    uiLang: 'Arayüz dili',
    multiPlan: 'Plan özeti (çoklu dosya)',
  },
  en: {
    appTitle: 'autoparts UI',
    files: 'Files',
    pickHelp: 'You can select one or more .py files.',
    selectedCount: 'file(s) selected',
    plan: 'Plan',
    planning: 'Planning…',
    build: 'Build Package',
    building: 'Building…',
    downloadZip: 'Download ZIP',
    downloadPkgs: 'Download packages.zip',
    settings: 'Settings',
    compact: 'Compact level (reduce modules)',
    compactHelp: 'Automatically reduce module count: 0=Off, 1=Low, 2=Medium (recommended), 3=Aggressive.',
    compactOffLabel: 'Off',
    compactLowLabel: 'Low',
    compactMedLabel: 'Medium',
    compactHighLabel: 'Aggressive',
    recommended: '(recommended)',
    packSmall: 'Merge small modules (line threshold)',
    packSmallHelp: "Modules below this line count are merged into 'core'. e.g., 120.",
    maxModules: 'Max modules',
    maxModulesHelp: 'If exceeded, smallest modules get merged (except constants/core).',
    minLines: 'Min lines per module',
    minLinesHelp: 'Modules under this threshold are fused with others. e.g., 80.',
    targetMods: 'Target module count',
    targetModsHelp: 'Try to reduce to this count if possible. Empty = disabled.',
    aiName: 'Suggest package name with AI',
    aiNameHelp: 'Suggests name via Ollama using docstrings & top-level names.',
    ollamaUrl: 'Ollama URL',
    ollamaUrlHelp: 'Local default: http://localhost:11434',
    ollamaModel: 'Ollama Model',
    ollamaModelHelp: 'e.g., gpt-oss:20b, mistral, llama3',
    aiEdit: 'Edit with AI',
    aiEditHelp: 'Edits a single file or returns a ZIP for multiple files.',
    instruction: 'Instruction',
    instrPlaceholder: 'e.g., Add docstrings, complete type hints, and remove unused imports.',
    langForAI: 'Comment language (AI)',
    langForAIHelp: 'Language for generated docstrings/comments.',
    aiEditing: 'Editing…',
    aiEditDo: 'Edit with AI',
    dlEdited: 'Download edited file',
    after: 'After (AI)',
    depGraph: 'Dependency Graph',
    aiPkgName: 'AI Package Name',
    pkgNameGen: 'Generated from docstrings and top-level names.',
    uiLang: 'UI language',
    multiPlan: 'Plan summary (multi-file)',
  },
  de: {
    appTitle: 'autoparts UI',
    files: 'Dateien',
    pickHelp: 'Wähle eine oder mehrere .py-Dateien aus.',
    selectedCount: 'Datei(en) ausgewählt',
    plan: 'Planen',
    planning: 'Plane…',
    build: 'Paket bauen',
    building: 'Baue…',
    downloadZip: 'ZIP herunterladen',
    downloadPkgs: 'packages.zip herunterladen',
    settings: 'Einstellungen',
    compact: 'Kompaktstufe (Module reduzieren)',
    compactHelp: 'Module automatisch reduzieren: 0=Aus, 1=Niedrig, 2=Mittel (empfohlen), 3=Aggressiv.',
    compactOffLabel: 'Aus',
    compactLowLabel: 'Niedrig',
    compactMedLabel: 'Mittel',
    compactHighLabel: 'Aggressiv',
    recommended: '(empfohlen)',
    packSmall: 'Kleine Module zusammenführen (Zeilen-Schwelle)',
    packSmallHelp: "Module unter dieser Zeilenanzahl in 'core' zusammenführen.",
    maxModules: 'Max Module',
    maxModulesHelp: 'Bei Überschreitung werden kleinste Module zusammengeführt.',
    minLines: 'Min Zeilen pro Modul',
    minLinesHelp: 'Module unter dieser Schwelle werden fusioniert.',
    targetMods: 'Ziel-Modulanzahl',
    targetModsHelp: 'Wenn möglich reduzieren. Leer = deaktiviert.',
    aiName: 'Paketname mit KI vorschlagen',
    aiNameHelp: 'Vorschlag über Ollama basierend auf Docstrings & Top-Level-Namen.',
    ollamaUrl: 'Ollama URL',
    ollamaUrlHelp: 'Lokal: http://localhost:11434',
    ollamaModel: 'Ollama Modell',
    ollamaModelHelp: 'z.B. gpt-oss:20b, mistral, llama3',
    aiEdit: 'Mit KI bearbeiten',
    aiEditHelp: 'Bearbeitet eine Datei oder ZIP für mehrere.',
    instruction: 'Anweisung',
    instrPlaceholder: 'z. B.: Docstrings hinzufügen, Typisierungen vervollständigen und unbenutzte Importe entfernen.',
    langForAI: 'Kommentarsprache (KI)',
    langForAIHelp: 'Sprache für generierte Docstrings/Kommentare.',
    aiEditing: 'Bearbeite…',
    aiEditDo: 'Mit KI bearbeiten',
    dlEdited: 'Bearbeitete Datei herunterladen',
    after: 'Nachher (KI)',
    depGraph: 'Abhängigkeitsgraph',
    aiPkgName: 'KI Paketname',
    pkgNameGen: 'Generiert aus Docstrings & Top-Level-Namen.',
    uiLang: 'UI-Sprache',
    multiPlan: 'Plansumme (Mehrdatei)',
  },
  fr: {
    appTitle: 'autoparts UI',
    files: 'Fichiers',
    pickHelp: 'Sélectionnez un ou plusieurs fichiers .py.',
    selectedCount: 'fichier(s) sélectionné(s)',
    plan: 'Planifier',
    planning: 'Planification…',
    build: 'Construire le paquet',
    building: 'Construction…',
    downloadZip: 'Télécharger le ZIP',
    downloadPkgs: 'Télécharger packages.zip',
    settings: 'Paramètres',
    compact: 'Niveau compact (réduire modules)',
    compactHelp: 'Réduction auto des modules : 0=Off, 1=Faible, 2=Moyen (recommandé), 3=Agressif.',
    compactOffLabel: 'Désactivé',
    compactLowLabel: 'Faible',
    compactMedLabel: 'Moyen',
    compactHighLabel: 'Agressif',
    recommended: '(recommandé)',
    packSmall: 'Fusionner petits modules (seuil de lignes)',
    packSmallHelp: "Les modules sous ce seuil sont fusionnés dans 'core'.",
    maxModules: 'Modules max',
    maxModulesHelp: 'Si dépassé, fusion des plus petits (sauf constants/core).',
    minLines: 'Lignes min par module',
    minLinesHelp: 'Sous ce seuil, fusion avec d’autres modules.',
    targetMods: 'Nombre de modules cible',
    targetModsHelp: 'Réduire à ce nombre si possible. Vide = désactivé.',
    aiName: 'Nom de paquet via IA',
    aiNameHelp: 'Propose via Ollama selon docstrings & noms top-level.',
    ollamaUrl: 'URL Ollama',
    ollamaUrlHelp: 'Local : http://localhost:11434',
    ollamaModel: 'Modèle Ollama',
    ollamaModelHelp: 'ex: gpt-oss:20b, mistral, llama3',
    aiEdit: 'Modifier avec IA',
    aiEditHelp: 'Modifie un fichier ou renvoie un ZIP pour plusieurs.',
    instruction: 'Instruction',
    instrPlaceholder: 'p. ex. : Ajouter des docstrings, compléter les annotations de type et supprimer les imports inutilisés.',
    langForAI: "Langue des commentaires (IA)",
    langForAIHelp: 'Langue des docstrings/commentaires générés.',
    aiEditing: 'Modification…',
    aiEditDo: 'Modifier avec IA',
    dlEdited: 'Télécharger le fichier modifié',
    after: 'Après (IA)',
    depGraph: 'Graphe de dépendances',
    aiPkgName: 'Nom du paquet IA',
    pkgNameGen: 'Généré depuis docstrings et noms top-level.',
    uiLang: 'Langue UI',
    multiPlan: 'Résumé du plan (multi-fichier)',
  },
  es: {
    appTitle: 'autoparts UI',
    files: 'Archivos',
    pickHelp: 'Puedes seleccionar uno o más archivos .py.',
    selectedCount: 'archivo(s) seleccionado(s)',
    plan: 'Planear',
    planning: 'Planeando…',
    build: 'Construir paquete',
    building: 'Construyendo…',
    downloadZip: 'Descargar ZIP',
    downloadPkgs: 'Descargar packages.zip',
    settings: 'Ajustes',
    compact: 'Nivel compacto (reducir módulos)',
    compactHelp: 'Reduce automáticamente módulos: 0=Desactivado, 1=Bajo, 2=Medio (recomendado), 3=Alto.',
    compactOffLabel: 'Desactivado',
    compactLowLabel: 'Bajo',
    compactMedLabel: 'Medio',
    compactHighLabel: 'Alto',
    recommended: '(recomendado)',
    packSmall: 'Unir módulos pequeños (límite de líneas)',
    packSmallHelp: "Módulos por debajo del límite se unen en 'core'.",
    maxModules: 'Módulos máx',
    maxModulesHelp: 'Si excede, une los más pequeños (excepto constants/core).',
    minLines: 'Líneas mín por módulo',
    minLinesHelp: 'Por debajo del límite se fusionan con otros.',
    targetMods: 'Módulos objetivo',
    targetModsHelp: 'Reducir a este número si es posible. Vacío = desactivado.',
    aiName: 'Sugerir nombre con IA',
    aiNameHelp: 'Usa Ollama con docstrings y nombres top-level.',
    ollamaUrl: 'URL de Ollama',
    ollamaUrlHelp: 'Local: http://localhost:11434',
    ollamaModel: 'Modelo Ollama',
    ollamaModelHelp: 'p. ej.: gpt-oss:20b, mistral, llama3',
    aiEdit: 'Editar con IA',
    aiEditHelp: 'Edita un archivo o devuelve ZIP para múltiples.',
    instruction: 'Instrucción',
    instrPlaceholder: 'p. ej.: Añade docstrings, completa las anotaciones de tipo y elimina imports no usados.',
    langForAI: 'Idioma de comentarios (IA)',
    langForAIHelp: 'Idioma para docstrings/comentarios generados.',
    aiEditing: 'Editando…',
    aiEditDo: 'Editar con IA',
    dlEdited: 'Descargar archivo editado',
    after: 'Después (IA)',
    depGraph: 'Grafo de dependencias',
    aiPkgName: 'Nombre de paquete IA',
    pkgNameGen: 'Generado a partir de docstrings y nombres top-level.',
    uiLang: 'Idioma de la UI',
    multiPlan: 'Resumen del plan (multi-archivo)',
  },
  ru: {
    appTitle: 'autoparts UI',
    files: 'Файлы',
    pickHelp: 'Выберите один или несколько .py файлов.',
    selectedCount: 'файл(ов) выбрано',
    plan: 'Планировать',
    planning: 'Планирование…',
    build: 'Собрать пакет',
    building: 'Сборка…',
    downloadZip: 'Скачать ZIP',
    downloadPkgs: 'Скачать packages.zip',
    settings: 'Настройки',
    compact: 'Степень сжатия (меньше модулей)',
    compactHelp: 'Авто-сокращение модулей: 0=Выкл, 1=Низк, 2=Средний (рекомендуется), 3=Агрессивный.',
    compactOffLabel: 'Выкл',
    compactLowLabel: 'Низкий',
    compactMedLabel: 'Средний',
    compactHighLabel: 'Агрессивный',
    recommended: '(рекомендуется)',
    packSmall: 'Объединять маленькие модули (порог строк)',
    packSmallHelp: "Маленькие модули объединяются в 'core'.",
    maxModules: 'Макс модулей',
    maxModulesHelp: 'Если превышено — объединять наименьшие (кроме constants/core).',
    minLines: 'Мин строк на модуль',
    minLinesHelp: 'Ниже порога — сливать с другими.',
    targetMods: 'Целевое число модулей',
    targetModsHelp: 'Стремиться к этому числу. Пусто = выкл.',
    aiName: 'Предложить имя пакета (ИИ)',
    aiNameHelp: 'Через Ollama по docstrings и верхнеуровневым именам.',
    ollamaUrl: 'Ollama URL',
    ollamaUrlHelp: 'Локально: http://localhost:11434',
    ollamaModel: 'Модель Ollama',
    ollamaModelHelp: 'напр.: gpt-oss:20b, mistral, llama3',
    aiEdit: 'Редактировать с ИИ',
    aiEditHelp: 'Редактирует один файл или ZIP для нескольких.',
    instruction: 'Инструкция',
    instrPlaceholder: 'напр.: Добавьте docstring-и, дополните подсказки типов и удалите неиспользуемые импорты.',
    langForAI: 'Язык комментариев (ИИ)',
    langForAIHelp: 'Язык генерируемых docstrings/комментариев.',
    aiEditing: 'Редактирование…',
    aiEditDo: 'Редактировать с ИИ',
    dlEdited: 'Скачать отредактированный файл',
    after: 'После (ИИ)',
    depGraph: 'Граф зависимостей',
    aiPkgName: 'Имя пакета (ИИ)',
    pkgNameGen: 'Генерируется из docstrings и верхних имен.',
    uiLang: 'Язык интерфейса',
    multiPlan: 'Итог плана (несколько файлов)',
  },
  ar: {
    appTitle: 'autoparts UI',
    files: 'الملفات',
    pickHelp: 'يمكنك اختيار ملف .py واحد أو أكثر.',
    selectedCount: 'ملف/ملفات محددة',
    plan: 'تخطيط',
    planning: 'جارٍ التخطيط…',
    build: 'بناء الحزمة',
    building: 'جارٍ البناء…',
    downloadZip: 'تنزيل ZIP',
    downloadPkgs: 'تنزيل packages.zip',
    settings: 'الإعدادات',
    compact: 'مستوى الدمج (تقليل الوحدات)',
    compactHelp: 'تقليل عدد الوحدات تلقائياً: 0=إيقاف، 1=منخفض، 2=متوسط (موصى به)، 3=عالٍ.',
    compactOffLabel: 'إيقاف',
    compactLowLabel: 'منخفض',
    compactMedLabel: 'متوسط',
    compactHighLabel: 'عالٍ',
    recommended: '(موصى به)',
    packSmall: 'دمج الوحدات الصغيرة (حد الأسطر)',
    packSmallHelp: "الوحدات تحت هذا الحد تُدمج في 'core'.",
    maxModules: 'أقصى عدد وحدات',
    maxModulesHelp: 'عند تجاوزه تُدمج الأصغر (باستثناء constants/core).',
    minLines: 'أدنى أسطر لكل وحدة',
    minLinesHelp: 'دون الحد يتم دمجها مع أخرى.',
    targetMods: 'عدد الوحدات المستهدف',
    targetModsHelp: 'حاول الوصول لهذا العدد. فارغ = معطل.',
    aiName: 'اقتراح اسم الحزمة بالذكاء الاصطناعي',
    aiNameHelp: 'يقترح عبر Ollama حسب التوثيق والأسماء العليا.',
    ollamaUrl: 'عنوان Ollama',
    ollamaUrlHelp: 'محلي: http://localhost:11434',
    ollamaModel: 'نموذج Ollama',
    ollamaModelHelp: 'مثال: gpt-oss:20ب، mistral، llama3',
    aiEdit: 'تحرير بالذكاء الاصطناعي',
    aiEditHelp: 'يحرر ملفاً واحداً أو يعيد ZIP لعدة ملفات.',
    instruction: 'التعليمات',
    instrPlaceholder: 'مثال: أضف توثيقات (docstrings)، أكمل تلميحات الأنواع، وأزل الواردات غير المستخدمة.',
    langForAI: 'لغة التعليق (للذكاء الاصطناعي)',
    langForAIHelp: 'لغة التوثيق/التعليقات المُولدة.',
    aiEditing: 'جارٍ التحرير…',
    aiEditDo: 'حرّر بالذكاء الاصطناعي',
    dlEdited: 'تنزيل الملف المُحرر',
    after: 'بعد (ذكاء اصطناعي)',
    depGraph: 'مخطط الاعتمادية',
    aiPkgName: 'اسم الحزمة (ذكاء اصطناعي)',
    pkgNameGen: 'يُولد من التوثيق والأسماء العليا.',
    uiLang: 'لغة الواجهة',
    multiPlan: 'ملخص الخطة (عدة ملفات)',

  },
  zh: {
    appTitle: 'autoparts 界面',
    files: '文件',
    pickHelp: '你可以选择一个或多个 .py 文件。',
    selectedCount: '个文件已选择',
    plan: '规划',
    planning: '规划中…',
    build: '打包',
    building: '打包中…',
    downloadZip: '下载 ZIP',
    downloadPkgs: '下载 packages.zip',
    settings: '设置',
    aiEdit: '用 AI 编辑',
    aiEditHelp: '单文件输出文本，多选将返回 ZIP。',
    instruction: '指令',
    instrPlaceholder: '例如：添加文档字符串、补全类型提示并移除未使用的导入。',
    langForAI: '说明语言（AI）',
    langForAIHelp: '文档/注释语言，不影响代码运行。',
    aiEditing: '正在编辑…',
    aiEditDo: '用 AI 编辑',
    dlEdited: '下载已编辑文件',
    after: '编辑后（AI）',
    depGraph: '依赖图',
    aiPkgName: 'AI 包名',
    pkgNameGen: '基于文档与顶级名称生成。',
    uiLang: '界面语言',
    multiPlan: '规划摘要（多文件）',
    chooseFile: '选择文件',
    editPreview: '编辑预览'
  },
  ja: {
    appTitle: 'autoparts UI',
    files: 'ファイル',
    pickHelp: '.py ファイルを1つ以上選択できます。',
    selectedCount: '件選択',
    plan: 'プラン',
    planning: 'プラン作成中…',
    build: 'パッケージ作成',
    building: '作成中…',
    downloadZip: 'ZIP をダウンロード',
    downloadPkgs: 'packages.zip をダウンロード',
    settings: '設定',
    aiEdit: 'AI で編集',
    aiEditHelp: '単一ファイルはテキスト、複数選択は ZIP を返します。',
    instruction: '指示',
    instrPlaceholder: '例：Docstring を追加、型ヒントを補完、未使用の import を削除。',
    langForAI: '説明言語（AI）',
    langForAIHelp: 'Docstring/コメントの言語。コード実行には影響しません。',
    aiEditing: '編集中…',
    aiEditDo: 'AI で編集',
    dlEdited: '編集済みファイルをダウンロード',
    after: '編集後（AI）',
    depGraph: '依存関係グラフ',
    aiPkgName: 'AI パッケージ名',
    pkgNameGen: 'Docstring とトップレベル名から生成します。',
    uiLang: 'UI 言語',
    multiPlan: 'プラン要約（複数ファイル）',
    chooseFile: 'ファイルを選択',
    editPreview: '編集プレビュー'
  },
}

const langList: {code: Lang, label: string, dir?: 'rtl'|'ltr'}[] = [
  {code:'tr', label:'Turkish', dir:'ltr'}, {code:'en', label:'English', dir:'ltr'}, {code:'de', label:'German', dir:'ltr'},
  {code:'fr', label:'French', dir:'ltr'}, {code:'es', label:'Spanish', dir:'ltr'}, {code:'ru', label:'Russian', dir:'ltr'},
  {code:'ar', label:'Arabic', dir:'rtl'}, {code:'zh', label:'Chinese', dir:'ltr'}, {code:'ja', label:'Japanese', dir:'ltr'},
]
function useUITranslations(){
  const [uiLang, setUiLang] = useState<Lang>(()=> (localStorage.getItem('uiLang') as Lang) || 'en')
  useEffect(()=>{
    localStorage.setItem('uiLang', uiLang)
    const meta = langList.find(l=>l.code===uiLang)
    document.documentElement.dir = meta?.dir || 'ltr'
  }, [uiLang])
  const t = (k: string) => (dict[uiLang] && dict[uiLang][k]) || dict.en[k] || k
  return { uiLang, setUiLang, t }
}

// ---- UI helpers ----
function Chip({children}: {children: React.ReactNode}){
  return <span className="px-2 py-0.5 rounded-full text-xs border">{children}</span>
}
function TooltipIcon({ text }: { text: string }){
  return (
    <span className="relative inline-flex items-center group select-none" aria-label={text}>
      <Info className="w-3.5 h-3.5 opacity-70 hover:opacity-100" />
      <span role="tooltip" className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-[135%] z-20 whitespace-nowrap rounded-md bg-black/90 text-white text-[11px] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">{text}</span>
    </span>
  )
}
function SettingRow({ label, help, children }:{ label: string, help?: string, children: React.ReactNode }){
  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium w-48 flex items-center gap-1">
          <span>{label}</span>
          {help && <TooltipIcon text={help} />}
        </div>
        <div className="flex-1 flex items-center gap-2">{children}</div>
      </div>
    </div>
  )
}

const API_BASE = 'http://localhost:8000'
type PerFilePlan = { filename: string, plan: any, ai_name?: string | null }

export default function App(){
  const { uiLang, setUiLang, t } = useUITranslations()
  const [theme, setTheme] = useState<'light'|'dark'>(()=> (localStorage.getItem('theme') as any) || 'light')
  useEffect(()=>{ document.documentElement.classList.toggle('dark', theme==='dark'); localStorage.setItem('theme', theme) }, [theme])

  const [files, setFiles] = useState<File[]>([])
  const [compact, setCompact] = useState(2)
  const [packSmall, setPackSmall] = useState(120)
  const [maxModules, setMaxModules] = useState(8)
  const [minLines, setMinLines] = useState(80)
  const [targetMods, setTargetMods] = useState<number | ''>(8)

  const [aiName, setAiName] = useState(true)
  const [ollamaURL, setOllamaURL] = useState('http://localhost:11434')
  const [ollamaModel, setOllamaModel] = useState('gpt-oss:20b')

  const [planning, setPlanning] = useState(false)
  const [building, setBuilding] = useState(false)
  const [singlePlan, setSinglePlan] = useState<any | null>(null)
  const [multiPlans, setMultiPlans] = useState<PerFilePlan[] | null>(null)
  const [aiSuggested, setAiSuggested] = useState<string | null>(null)
  const [downloadURL, setDownloadURL] = useState<string | null>(null)

  // AI edit
  const [editInstruction, setEditInstruction] = useState<string>('')
  const [editedText, setEditedText] = useState<string>('')
  const [editing, setEditing] = useState(false)
  const [editProgress, setEditProgress] = useState<number>(0)
  const [editStatus, setEditStatus] = useState<string>('')
  const [editedZipURL, setEditedZipURL] = useState<string | null>(null)
  const [editLang, setEditLang] = useState<Lang>('tr')

  function onPick(e: React.ChangeEvent<HTMLInputElement>){
    const fl = Array.from(e.target.files || [])
    setFiles(fl)
    setEditedText('')
    setEditedZipURL(null)
    setDownloadURL(null)
    setSinglePlan(null)
    setMultiPlans(null)
    setAiSuggested(null)
  }

  async function doPlan(){
    if(!files.length) return
    setPlanning(true)
    setSinglePlan(null); setMultiPlans(null); setAiSuggested(null); setDownloadURL(null)

    if(files.length === 1){
      const sfd = new FormData()
      sfd.append('file', files[0], files[0].name)
      sfd.append('compact', String(compact))
      sfd.append('pack_small_lines', String(packSmall))
      sfd.append('max_modules', String(maxModules))
      sfd.append('min_module_lines', String(minLines))
      if(targetMods !== '') sfd.append('target_modules', String(targetMods))
      sfd.append('ai_name', String(aiName))
      sfd.append('ollama_base_url', ollamaURL)
      sfd.append('ollama_model', ollamaModel)
      const res = await fetch(`${API_BASE}/plan`, { method: 'POST', body: sfd })
      const data = await res.json()
      setSinglePlan(data); setAiSuggested(data.ai_name || null)
      setMultiPlans(null)
    }else{
      const mfd = new FormData()
      for(const f of files) mfd.append('files', f, f.name)
      mfd.append('compact', String(compact))
      mfd.append('pack_small_lines', String(packSmall))
      mfd.append('max_modules', String(maxModules))
      mfd.append('min_module_lines', String(minLines))
      if(targetMods !== '') mfd.append('target_modules', String(targetMods))
      mfd.append('ai_name', String(aiName))
      mfd.append('ollama_base_url', ollamaURL)
      mfd.append('ollama_model', String(ollamaModel))
      const res = await fetch(`${API_BASE}/plan_multi`, { method: 'POST', body: mfd })
      const data = await res.json()
      setMultiPlans(data.files || [])
      setSinglePlan(null)
    }
    setPlanning(false)
  }

  async function doBuild(){
    if(!files.length) return
    setBuilding(true); setDownloadURL(null)

    if(files.length === 1){
      const fd = new FormData()
      fd.append('file', files[0], files[0].name)
      if(aiSuggested) fd.append('package_name', aiSuggested)
      fd.append('compact', String(compact))
      fd.append('pack_small_lines', String(packSmall))
      fd.append('max_modules', String(maxModules))
      fd.append('min_module_lines', String(minLines))
      if(targetMods !== '') fd.append('target_modules', String(targetMods))
      fd.append('ai_name', String(aiName))
      fd.append('ollama_base_url', ollamaURL)
      fd.append('ollama_model', String(ollamaModel))
      const res = await fetch(`${API_BASE}/build`, { method: 'POST', body: fd })
      const blob = await res.blob(); setDownloadURL(URL.createObjectURL(blob))
    }else{
      const fd = new FormData()
      for(const f of files) fd.append('files', f, f.name)
      fd.append('compact', String(compact))
      fd.append('pack_small_lines', String(packSmall))
      fd.append('max_modules', String(maxModules))
      fd.append('min_module_lines', String(minLines))
      if(targetMods !== '') fd.append('target_modules', String(targetMods))
      fd.append('ai_name', String(aiName))
      fd.append('ollama_base_url', ollamaURL)
      fd.append('ollama_model', String(ollamaModel))
      const res = await fetch(`${API_BASE}/build_multi`, { method: 'POST', body: fd })
      const blob = await res.blob(); setDownloadURL(URL.createObjectURL(blob))
    }
    setBuilding(false)
  }

  async function doAiEdit(){
    if(!files.length) return
    setEditing(true); setEditedText(''); setEditedZipURL(null);
    setEditProgress(0); setEditStatus(t('aiEditing'));
    // Progress simulation up to ~90% while waiting for server
    let _alive = true;
    const t0 = Date.now();
    const tick = () => {
      if(!_alive) return; const dt = Date.now() - t0;
      const p = Math.min(90, Math.floor(100 * (1 - Math.exp(-dt/2000))));
      setEditProgress(p);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);


    if(files.length === 1){
      const fd = new FormData()
      fd.append('file', files[0], files[0].name)
      fd.append('instruction', editInstruction)
      fd.append('language', editLang)
      fd.append('ollama_base_url', ollamaURL)
      fd.append('ollama_model', String(ollamaModel))
      const res = await fetch(`${API_BASE}/ai_edit`, { method: 'POST', body: fd })
      const data = await res.json(); setEditedText(data.edited || ''); setEditProgress(100); setEditStatus('Completed')
    }else{
      const fd = new FormData()
      for(const f of files) fd.append('files', f, f.name)
      fd.append('instruction', editInstruction)
      fd.append('language', editLang)
      fd.append('ollama_base_url', ollamaURL)
      fd.append('ollama_model', String(ollamaModel))
      const res = await fetch(`${API_BASE}/ai_edit_multi`, { method: 'POST', body: fd })
      const blob = await res.blob(); setEditedZipURL(URL.createObjectURL(blob)); setEditProgress(100); setEditStatus('Completed')
    }
    _alive = false; setTimeout(()=> setEditing(false), 350)
  }

  function downloadEditedSingle(){
    if(!editedText || !files.length) return
    const blob = new Blob([editedText], { type: 'text/x-python;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = files[0].name.replace(/\.py$/i, '') + '.edited.py'; a.click()
    URL.revokeObjectURL(a.href)
  }

  // Graph nodes/edges for single-plan view
  const nodes: Node[] = useMemo(()=>{
    if(!singlePlan) return []
    const comps = singlePlan.plan.components as {module_name: string, lines: number}[]
    return comps.map((c, i)=>({
      id: c.module_name,
      data: { label: `${c.module_name}
~${c.lines}` },
      position: { x: (i%3)*260, y: Math.floor(i/3)*140 },
      style: { borderRadius: 12, padding: 8 }
    }))
  }, [singlePlan])

  const edges: Edge[] = useMemo(()=>{
    if(!singlePlan) return []
    return (singlePlan.plan.edges as {from: string, to: string}[]).map((e, i)=>({
      id: String(i), source: e.from, target: e.to, animated: true
    }))
  }, [singlePlan])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-neutral-950 dark:to-neutral-900 text-gray-900 dark:text-gray-200">
    
      {/* TOP BAR */}
      <header className="toolbar">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-2">
          <Package className="w-5 h-5" />
          <div className="font-semibold">{t('appTitle')}</div>
    
          <div className="ml-auto flex items-center gap-2">
            <Globe className="w-4 h-4 opacity-70" />
            <select
              className="border rounded-lg px-2 py-1 text-sm dark:bg-neutral-900/70 dark:text-gray-100 dark:border-white/10"
              value={uiLang}
              onChange={(e) => setUiLang(e.target.value as Lang)}
            >
              {langList.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
    
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="btn ml-1"
              title={theme === 'dark' ? 'Light' : 'Dark'}
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4">

        {/* File selection & Plan summary shown in the same card */}
        <div className="grid md:grid-cols-3 gap-4">
          <section className="md:col-span-2 card-surface p-4">
            <div className="flex items-center gap-2 mb-3">
              <Upload className="w-4 h-4"/>
              <h2 className="font-semibold">{t('files')}</h2>
              <TooltipIcon text={t('pickHelp')}/>
            </div>
            <input id="filePick" type="file" className="hidden" multiple accept=".py" onChange={onPick} />
<label htmlFor="filePick" className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer hover:bg-gray-50">
  <Upload className="w-4 h-4"/>{t('chooseFile')}
</label>
            {files.length>0 && (
              <div className="mt-2 text-sm opacity-70 flex items-center gap-2">
                <Files className="w-4 h-4"/>{files.length} {t('selectedCount')}
              </div>
            )}

            <div className="flex gap-2 mt-4 flex-wrap">
              <button onClick={doPlan} disabled={!files.length||planning} className="btn">
                <Wand2 className="w-4 h-4"/>
                {planning? t('planning'):t('plan')}
              </button>
              <button onClick={doBuild} disabled={!files.length||building} className="btn">
                <Rocket className="w-4 h-4"/>
                {building? t('building'):t('build')}
              </button>
              {downloadURL && (
                <a href={downloadURL} download className="btn">
                  <Download className="w-4 h-4"/> {files.length>1 ? t('downloadPkgs') : t('downloadZip')}
                </a>
              )}
            </div>

            {/* Multi-file plan summary moves here */}
            {multiPlans && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Link2 className="w-4 h-4"/>
                  <h3 className="font-semibold">{t('multiPlan')}</h3>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {multiPlans.map((pf)=> (
                    <motion.div key={pf.filename} initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="rounded-xl border bg-white p-4 shadow-sm">
                      <div className="font-medium mb-1">{pf.filename}</div>
                      <div className="text-xs opacity-60 mb-2">AI: {pf.ai_name || '—'}</div>
                      <div className="flex flex-wrap gap-1">
                        {pf.plan.components.slice(0, 8).map((c: any)=> <Chip key={c.module_name}>{c.module_name}</Chip>)}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Ayarlar */}
          <section className="card-surface p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4"/>
              <h2 className="font-semibold">{t('settings')}</h2>
            </div>

            <SettingRow label={t('compact')} help={t('compactHelp')}>
              <select value={compact} onChange={e=>setCompact(Number(e.target.value))} className="border rounded-lg px-2 py-1">
                <option value={0}>{t('compactOffLabel')}</option>
                <option value={1}>{t('compactLowLabel')}</option>
                <option value={2}>{t('compactMedLabel')} {t('recommended')}</option>
                <option value={3}>{t('compactHighLabel')}</option>
              </select>
            </SettingRow>

            <SettingRow label={t('packSmall')} help={t('packSmallHelp')}>
              <input type="number" value={packSmall} onChange={e=>setPackSmall(Number(e.target.value))} className="border rounded-lg px-2 py-1 w-28" placeholder="120" min={0} />
            </SettingRow>

            <SettingRow label={t('maxModules')} help={t('maxModulesHelp')}>
              <input type="number" value={maxModules} onChange={e=>setMaxModules(Number(e.target.value))} className="border rounded-lg px-2 py-1 w-28" placeholder="8" min={1} />
            </SettingRow>

            <SettingRow label={t('minLines')} help={t('minLinesHelp')}>
              <input type="number" value={minLines} onChange={e=>setMinLines(Number(e.target.value))} className="border rounded-lg px-2 py-1 w-28" placeholder="80" min={0} />
            </SettingRow>

            <SettingRow label={t('targetMods')} help={t('targetModsHelp')}>
              <input type="number" value={targetMods} onChange={e=>setTargetMods(e.target.value===''? '': Number(e.target.value))} className="border rounded-lg px-2 py-1 w-28" placeholder="8" min={1} />
            </SettingRow>

            <div className="h-px bg-gray-200 dark:bg-white/10 my-3" />

            <SettingRow label={t('aiName')} help={t('aiNameHelp')}>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={aiName} onChange={e=>setAiName(e.target.checked)} />
                <span>ON</span>
              </label>
            </SettingRow>

            <SettingRow label={t('ollamaUrl')} help={t('ollamaUrlHelp')}>
              <input value={ollamaURL} onChange={e=>setOllamaURL(e.target.value)} className="border rounded-lg px-2 py-1 flex-1" placeholder="http://localhost:11434" />
            </SettingRow>

            <SettingRow label={t('ollamaModel')} help={t('ollamaModelHelp')}>
              <input value={ollamaModel} onChange={e=>setOllamaModel(e.target.value)} className="border rounded-lg px-2 py-1 flex-1" placeholder="gpt-oss:20b" />
            </SettingRow>
          </section>
        </div>

        {/* AI Editing */}
        <section className="card-surface p-4 mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4"/>
            <h2 className="font-semibold">{t('aiEdit')}</h2>
            <TooltipIcon text={t('aiEditHelp')}/>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">{t('instruction')}</label>
            <textarea
              className="border rounded-lg p-2 min-h-[70px]"
              placeholder={t('instrPlaceholder')}
              value={editInstruction}
              onChange={e=>setEditInstruction(e.target.value)}
              autoComplete="off"
            />
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 opacity-70"/>
              <span className="text-sm w-56">{t('langForAI')}</span>
              <select className="border rounded-lg px-2 py-1" value={editLang} onChange={(e)=>setEditLang(e.target.value as Lang)}>
                <option value="auto">auto</option>
                <option value="tr">Turkish</option>
                <option value="en">English</option>
                <option value="de">German</option>
                <option value="fr">French</option>
                <option value="es">Spanish</option>
                <option value="ru">Russian</option>
                <option value="ar">Arabic</option>
              </select>
              <TooltipIcon text={t('langForAIHelp')}/>
            </div>

            <div className="flex gap-2 flex-wrap mt-2">
              <button onClick={doAiEdit} disabled={!files.length||editing} className="btn">
                <Sparkles className="w-4 h-4"/>
                {editing ? t('aiEditing') : t('aiEditDo')}
              </button>
              {files.length===1 ? (
                (!!editedText && !editing) && (
                  <button onClick={downloadEditedSingle} className="btn">
                    <Download className="w-4 h-4"/> {t('dlEdited')}
                  </button>
                )
              ) : (
                (!!editedZipURL && !editing) && (
                  <a href={editedZipURL} download className="btn"><Download className="w-4 h-4"/> edited_files.zip</a>
                )
              )}
            </div>
          </div>

          {/* Only AFTER for single-file */}
          {files.length===1 && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-1">{t('after')}</div>
              <textarea className="w-full h-64 border rounded-lg p-2 font-mono text-xs" value={editedText} readOnly />
            </div>
          )}
        </section>

        {/* Single-file dependency graph & AI name */}
        {singlePlan && (
          <section className="mt-6 grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 card-surface p-4">
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="w-4 h-4"/>
                <h2 className="font-semibold">{t('depGraph')}</h2>
              </div>
              <div className="h-[380px] rounded-lg border">
                <ReactFlow nodes={nodes} edges={edges} fitView>
                  <Background />
                  <Controls />
                  <MiniMap />
                </ReactFlow>
              </div>
            </div>
            <div className="card-surface p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="w-4 h-4"/>
                <h2 className="font-semibold">{t('aiPkgName')}</h2>
              </div>
              <div className="text-sm">
                {aiSuggested ? <Chip>{aiSuggested}</Chip> : <span className="opacity-60">—</span>}
              </div>
              <div className="mt-3 text-xs opacity-60">
                {t('pkgNameGen')}
              </div>
            </div>
          </section>
        )}
      
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/90 dark:bg-neutral-900/90 shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-5 h-5" />
              <div className="text-lg font-semibold">{t('aiEditing')}</div>
            </div>
            <div className="mb-2 text-sm text-gray-700 dark:text-gray-300 flex justify-between">
              <span>{editStatus || t('aiEditing')}</span>
              <span className="tabular-nums font-medium">{editProgress}%</span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden ring-1 ring-gray-300 dark:ring-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 shadow-md"
                style={{ width: `${editProgress}%`, transition: "width .35s ease" }}
              />
            </div>
            <div className="mt-3 text-xs text-gray-500">This process may vary depending on your system speed and the model's response.</div>
          </div>
        </div>
      )}

      </main>
    </div>
  )
}
