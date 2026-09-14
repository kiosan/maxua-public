/**
 * Copy for the personal pages (home, /variety) in English and Ukrainian.
 * The English text is the original; the Ukrainian is the author's own version,
 * not a word-for-word translation. Prose blocks are HTML strings rendered raw.
 */

const en = {
  lang: 'en',
  htmlLang: 'en',
  ogLocale: 'en_US',
  switcher: { label: 'Language', uk: 'UA', en: 'EN' },
  person: { name: 'Sasha Bondar', tagline: 'Engineer and entrepreneur' },
  home: {
    title: 'Sasha Bondar',
    description: 'Engineer and entrepreneur. Writing «Requisite Variety», a book about a systems method for working with AI. Running reintech.io.',
    keywords: 'Sasha Bondar, Requisite Variety, Reintech, AI, systems thinking',
    bookHeading: "I'm writing a book",
    bookText: '<em>Requisite Variety</em> — a systems method for working with AI. Not prompt collections: a way to see your work with a model as a system and stay the one who steers. Written in the open; finished chapters go up as they\'re ready.',
    bookLink: 'About the book and chapters →',
    bookCoverAlt: 'Requisite Variety — book cover',
    reintechHeading: 'I run Reintech',
    reintechText: '<a href="https://reintech.io">Reintech</a> is a hiring marketplace for senior software engineers: candidates are vetted on how they actually think — an adversarial AI interview over their real work, then a human one — and companies hire from two-three finalists in days, with legal and payroll handled.',
    reintechLink: 'reintech.io →',
    linkedin: 'LinkedIn →'
  },
  variety: {
    title: 'Requisite Variety: The Systems Method for Working with AI',
    description: 'Everyone has access to the same AI models. Yet the results differ by an order of magnitude. A method built on twentieth-century systems theory, not on tools: tools come and go, the regularities stay.',
    keywords: 'Requisite Variety, Ashby, Stafford Beer, cybernetics, systems theory, AI, LLM, systems thinking, software engineering, Sasha Bondar',
    breadcrumbHome: 'Home',
    breadcrumbBook: 'Requisite Variety',
    heroTitle: 'Requisite Variety',
    heroSubtitle: 'The Systems Method for Working with AI — Beyond Prompts and Tools',
    heroByline: 'Written in the open, in Ukrainian first — English essays coming.',
    coverHref: '/variety/read/en/',
    coverImage: '/images/variety-cover-en.png',
    ogImage: '/images/variety-cover-en-og.png',
    coverAlt: 'Requisite Variety — book cover: a blue morpho butterfly on cream',
    about: `
      <p>Everyone has access to the same AI models. Yet the results differ by an order of magnitude. Why?</p>

      <p>It's not the prompts. It's not the tools. It's who controls whom.</p>

      <p>In 1956, cybernetician W. Ross Ashby formulated the law of requisite variety: only variety can absorb variety. A modern AI model produces an enormous variety of outputs. An engineer armed with prompt collections has a handful of templated reactions. In that pair, the question of who is steering is arithmetic, not willpower.</p>

      <p>Ashby's law is the door, not the house. Behind it stands the systems theory of the twentieth century — Ashby himself, Stafford Beer, and the general theory of systems and activity that grew out of cybernetics. Every system drifts toward a goal of its own. Activity breaks into components that don't substitute for one another. Norms are variety stored in writing. Control is a tolerance zone built into the design, not a matter of attention. A system that has stabilized goes quiet — and rusts unnoticed. The book takes these regularities and gives them the language of daily engineering practice.</p>

      <p>Tools come and go. The model you use today will be replaced before this book is finished; the agent you'll run next year doesn't exist yet. The regularities stay, because they are about how systems behave, not about how a particular tool is built. Learn them once — and you can work with any new tool, now and whatever comes after.</p>

      <p>Power tools made carpenters faster — and made it easier to drill straight through the workpiece. AI is the power tool of knowledge work. This book is about keeping the feel of the material in your hands.</p>

      <p>It gives you a method, not tips:</p>
      <ul>
        <li>See what you actually operate: not a model, but a system — you, the model, the context, the tools, the artifacts.</li>
        <li>Separate your goal from the proxy the machine optimizes — the gap between them is where disappointment lives.</li>
        <li>Build norms and control loops that turn one-off wins into repeatable results — and make agents safe to trust.</li>
        <li>Understand AI slop as a diagnosis, not bad luck: low-variety input produces average output.</li>
      </ul>

      <p>Written primarily for software engineers. Useful for anyone who works with LLMs seriously. A short final part addresses managers: how to see whether a team is producing or merely circulating.</p>

      <p>What's not inside: tool reviews, model comparisons, prompt collections. Everything in this book will still be true three model generations from now.</p>
    `,
    bridge: 'The book is being written in the open — finished chapters are up, with diagrams, as they reach a stable state.',
    readPrimary: { href: '/variety/read/en/', lang: 'en', text: 'Read the chapters in English →' },
    readSecondary: { href: '/variety/read/', lang: 'uk', text: 'Читати розділи українською →' },
    subscribeHeading: 'Get new chapters and essays',
    subscribeText: 'English essays land in the Requisite Variety section of my newsletter; Ukrainian chapters — in the main feed. Pick what you need.',
    subscribeIframeTitle: 'Subscribe to the newsletter'
  }
};

const uk = {
  lang: 'uk',
  htmlLang: 'uk',
  ogLocale: 'uk_UA',
  switcher: { label: 'Мова', uk: 'UA', en: 'EN' },
  person: { name: 'Саша Бондар', tagline: 'Інженер і підприємець' },
  home: {
    title: 'Саша Бондар',
    description: 'Інженер і підприємець. Пишу «Необхідне різноманіття» — книжку про системний метод роботи з AI. Керую reintech.io.',
    keywords: 'Саша Бондар, Необхідне різноманіття, Reintech, AI, системне мислення',
    bookHeading: 'Пишу книжку',
    bookText: '«Необхідне різноманіття» — системний метод роботи з AI. Не збірка промптів: спосіб побачити свою роботу з моделлю як систему і лишитися тим, хто керує. Пишу відкрито — готові розділи з\'являються на сайті, щойно дозрівають.',
    bookLink: 'Про книжку і розділи →',
    bookCoverAlt: 'Необхідне різноманіття — обкладинка книжки',
    reintechHeading: 'Керую Reintech',
    reintechText: '<a href="https://reintech.io">Reintech</a> — маркетплейс найму досвідчених інженерів. Кандидатів перевіряємо на тому, як вони справді думають: спершу прискіпливе AI-інтерв\'ю по їхній реальній роботі, потім розмова з людиною. Компанії наймають із двох-трьох фіналістів за кілька днів; договори й виплати беремо на себе.',
    reintechLink: 'reintech.io →',
    linkedin: 'LinkedIn →'
  },
  variety: {
    title: 'Необхідне різноманіття: системний метод роботи з AI',
    description: 'У всіх однакові моделі — а результати різняться на порядок. Метод, побудований на системній теорії двадцятого століття, а не на інструментах: інструменти приходять і йдуть, закономірності лишаються.',
    keywords: 'Необхідне різноманіття, Ешбі, Стаффорд Бір, кібернетика, системна теорія, AI, LLM, системне мислення, розробка, Саша Бондар',
    breadcrumbHome: 'Головна',
    breadcrumbBook: 'Необхідне різноманіття',
    heroTitle: 'Необхідне різноманіття',
    heroSubtitle: 'Системний метод роботи з AI — поза промптами й інструментами',
    heroByline: 'Пишеться відкрито, українською; англійське дзеркало — слідом.',
    coverHref: '/variety/read/',
    coverImage: '/images/variety-cover-uk.png',
    ogImage: '/images/variety-cover-uk-og.png',
    coverAlt: 'Необхідне різноманіття — обкладинка книжки: синій метелик морфо на кремовому тлі',
    about: `
      <p>У всіх однакові моделі. А результати різняться на порядок. Чому?</p>

      <p>Справа не в промптах. І не в інструментах. Справа в тому, хто ким керує.</p>

      <p>У 1956 році кібернетик Вільям Росс Ешбі сформулював закон необхідного різноманіття: тільки різноманіття поглинає різноманіття. Сучасна модель видає величезне різноманіття відповідей. Інженер зі збіркою промптів має жменю шаблонних реакцій. Хто в цій парі керує — питання арифметики, а не зусиль.</p>

      <p>Закон Ешбі — двері, а не будинок. За ними стоїть системна теорія двадцятого століття: сам Ешбі, Стаффорд Бір, загальна теорія систем і діяльності, що виросла з кібернетики. Кожна система дрейфує до власної цілі. Діяльність складається зі складових, які не замінюють одна одну. Норми — це різноманіття, законсервоване в текст. Контроль — зона допуску, закладена в конструкцію, а не питання уважності. Система, що стабілізувалась, затихає — і непомітно іржавіє. Книжка бере ці закономірності й дає їм мову щоденної інженерної практики.</p>

      <p>Інструменти приходять і йдуть. Модель, якою ви користуєтесь сьогодні, замінять ще до того, як книжку буде дописано; агента, якого ви запустите наступного року, ще не існує. Закономірності лишаються, бо вони про те, як поводяться системи, а не про те, як влаштований конкретний інструмент. Вивчіть їх раз — і працюватимете з будь-яким новим інструментом, зараз і з тим, що прийде після.</p>

      <p>Електроінструмент зробив столярів швидшими — і полегшив просвердлити заготовку наскрізь. AI — електроінструмент розумової праці. Ця книжка про те, як не втратити відчуття матеріалу в руках.</p>

      <p>Вона дає метод, а не поради:</p>
      <ul>
        <li>Бачити, чим ви насправді оперуєте: не моделлю, а системою — ви, модель, контекст, інструменти, артефакти.</li>
        <li>Відділяти свою ціль від проксі, яку оптимізує машина, — у розриві між ними живе розчарування.</li>
        <li>Будувати норми й контури контролю, що перетворюють разові вдачі на повторюваний результат — і роблять агентів такими, яким можна довіряти.</li>
        <li>Розуміти AI-слоп як діагноз, а не невезіння: вхід з низьким різноманіттям дає середній вихід.</li>
      </ul>

      <p>Написана передусім для програмістів. Корисна кожному, хто працює з LLM серйозно. Коротка остання частина — для менеджерів: як побачити, чи команда виробляє, чи лише крутиться.</p>

      <p>Чого всередині немає: оглядів інструментів, порівнянь моделей, збірок промптів. Усе в цій книжці лишиться правдою і через три покоління моделей.</p>
    `,
    bridge: 'Книжка пишеться відкрито — готові розділи зі схемами з\'являються тут, щойно текст стабілізується.',
    readPrimary: { href: '/variety/read/', lang: 'uk', text: 'Читати розділи українською →' },
    readSecondary: { href: '/variety/read/en/', lang: 'en', text: 'Read the chapters in English →' },
    subscribeHeading: 'Нові розділи — на пошту',
    subscribeText: 'Українські розділи виходять в основній стрічці моєї розсилки; англійські есеї — в секції Requisite Variety. Обирайте, що потрібно.',
    subscribeIframeTitle: 'Підписатися на розсилку'
  }
};

module.exports = { en, uk };
