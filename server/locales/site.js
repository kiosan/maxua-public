/**
 * Copy for the personal pages (home, /variety, /workshop) in English and Ukrainian.
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
    linkedin: 'LinkedIn →',
    workshopHeading: 'I run corporate AI workshops',
    workshopText: 'For team leads who want their people to actually use AI at work. One day, a group of five to ten from your team, one real task from their work — and by evening a working solution: an automation, a data pipeline or a small tool. No programming required.',
    workshopLink: 'About the workshop →',
    projectsHeading: 'My projects',
    projects: [
      { name: 'Reintech', href: 'https://reintech.io', text: 'A small recruiting agency for senior engineers, remote and local. A recruiter reads the CV and interviews for judgment: decisions, trade-offs, incidents from real work. Companies get two-three finalists with a written take; for remote hires we hold the contract and run payroll. Engineers never pay.' },
      { name: 'Gyrator', href: 'https://gyrator.io', text: 'An open-source team instrument: a five-minute check-in each cycle that rates every working relationship from both ends. Team-level results only, no scores on people.' },
      { name: 'ZoeEdu', href: 'https://zoeedu.com', text: 'Interactive math lessons for grades 1–4, in Ukrainian. Grade 4 is ready; more grades and subjects are on the way.' }
    ],
  },
  workshop: {
    title: 'Corporate AI Workshop: from an LLM chat to AI solutions',
    description: 'A one-day corporate workshop for a team of five to ten people: we take a real task from their work and build an AI solution for it on the spot. Not only tools, but a way of working with AI that outlives them. For team leads who want their team to use AI for real. No code. Saturday or Sunday.',
    keywords: 'AI workshop, Claude Code, MCP, agents, automation, no-code, corporate training, Sasha Bondar',
    breadcrumbHome: 'Home',
    breadcrumbPage: 'Corporate AI Workshop',
    kicker: 'Corporate AI Workshop · one full day · a team of 5–10',
    heroTitle: 'From an LLM chat to AI solutions',
    heroLead: 'A workshop for your team that takes one whole day. We gather at your office or out of town, take a concrete task your people face at work, and build a solution for it right there in the room: an automation, a data pipeline or a small tool. And we talk not only about tools, but about the approach: how to work with AI in a way that stays true for the tools that have not been built yet.',
    heroFacts: ['Saturday or Sunday', 'A team of 5–10', '$2,000 per workshop'],
    heroCta: 'Pick a date',
    forHeading: 'Who it is for',
    forText: [
      'You lead a team or a department. Your people run into tasks every day where AI could help, but it is not yet clear how. Some have tried the chat and were not impressed. Others use it a lot and want to be able to do more. You want the whole team to move, not two enthusiasts.',
      'Nobody on the team needs to know how to program. Without code it is even more interesting: people look at their daily work from the outside and see what can safely be handed to AI.'
    ],
    forDeptsLabel: 'Works for any team:',
    depts: ['Accounting', 'Manufacturing', 'Finance', 'Sales', 'Support', 'Documentation'],
    howHeading: 'How the day goes',
    howIntro: 'A rough plan. We start around 10 or 11 in the morning.',
    schedule: [
      { time: '1–2 h', title: 'Start: the philosophy of working with AI', text: 'Not which buttons to press, but how this work is built: what changes from tool to tool and what stays the same. These regularities will still hold for the models and agents that come next. We look at who uses AI how today, go through the terminology and the basic toolkit.' },
      { time: '', title: 'Choosing a task', text: 'I help each participant pick an idea: an automation, a service or a small app for their own work.' },
      { time: '45–60 min', title: 'Break', text: '' },
      { time: '30–40 min', title: 'Demo', text: 'I build an app or an automation in front of you, from the task to the result.' },
      { time: '2–4 h', title: 'Working on the projects', text: 'A looser pace, with breaks. I am in the room, helping each participant.' },
      { time: '1 h', title: 'Final demo', text: 'Everyone shows what they built.' }
    ],
    whereHeading: 'Where it happens',
    whereText: [
      'It is a weekend, so one option is your office: I come to you. But another one works better: leave the city for a day, somewhere with a view of nature and everything needed for work — a table, a screen, internet. A change of scenery helps people look at their usual work from the outside, and that is the whole point of the day.',
      'I can suggest a few places.'
    ],
    toolsText: 'Along the way I show the tools I use myself: Claude Code, MCP, agents. No lecturing, only what will actually be useful.',
    tools: ['Claude Code', 'MCP', 'Agents'],
    resultHeading: 'What you leave with',
    results: [
      'How to set a task for AI and plan the solution, instead of begging for an answer piece by piece.',
      'How to work so that AI does not lose the thread and does exactly what you need.',
      'Claude Code installed, and a first acquaintance with the terminal.',
      'The nerve to take on ambitious tasks.'
    ],
    hostHeading: 'Your host',
    hostName: 'Sasha Bondar',
    hostText: [
      'I have not written code by hand for a long time; AI writes it. What matters now is different: notice the task, decide whether it is worth solving at all, break it into parts, design the solution, build it, figure out what we learned along the way, and redo it with that knowledge. Then fit it into the daily workflow. Notice there is no «write code» step in that list?',
      'I am writing a book about this, <a href="/variety"><em>Requisite Variety</em></a>, I run workshops, and I see every day how AI changes what one person can get done. At the workshop I show this process on a real example.'
    ],
    testimonialsHeading: 'What participants say',
    testimonials: [],
    testimonialsEmpty: 'Participant reviews will appear here.',
    priceHeading: 'Format and price',
    priceFacts: [
      ['Length', 'one full day'],
      ['Day', 'Saturday or Sunday'],
      ['Group', '5–10 people'],
      ['Place', 'your office or out of town'],
      ['Price', '$2,000 per workshop']
    ],
    priceNote: 'Write me what your team struggles with, and we will pick a date.',
    ctaEmail: 'obondar@gmail.com',
    contactLabel: 'Write to me:'
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
    linkedin: 'LinkedIn →',
    workshopHeading: 'Проводжу корпоративні AI-воркшопи',
    workshopText: 'Для керівників, які хочуть, щоб їхня команда справді користувалась AI у роботі. Один день, група з п\'яти-десяти людей вашої команди, одна конкретна задача з їхньої роботи — і до вечора готове рішення: автоматизація, обробка даних чи невеликий інструмент. Програмувати не треба.',
    workshopLink: 'Про воркшоп →',
    projectsHeading: 'Мої проєкти',
    projects: [
      { name: 'Reintech', href: 'https://reintech.io', text: 'Невелика рекрутингова агенція для досвідчених інженерів, віддалено і локально. Рекрутер читає CV і проводить інтерв\'ю про реальну роботу: рішення, компроміси, інциденти. Компанія отримує двох-трьох фіналістів з письмовим висновком; для віддалених наймів беремо на себе контракт і виплати. Інженер не платить нічого.' },
      { name: 'Gyrator', href: 'https://gyrator.io', text: 'Open-source інструмент для команд: п\'ятихвилинне опитування раз на цикл, яке оцінює кожен робочий зв\'язок з обох боків. Результати лише на рівні команди, жодних оцінок людям.' },
      { name: 'ZoeEdu', href: 'https://zoeedu.com', text: 'Інтерактивні уроки математики для 1–4 класів українською. Четвертий клас готовий, решту класів і предметів додаємо.' }
    ],
  },
  workshop: {
    title: 'Корпоративний AI Workshop: від LLM-чату — до AI-рішень',
    description: 'Одноденний корпоративний воркшоп для команди з п\'яти-десяти людей: беремо реальну задачу з їхньої роботи і робимо під неї AI-рішення прямо на зустрічі. Не лише інструменти, а спосіб роботи з AI, який їх переживе. Для керівників, які хочуть, щоб команда користувалась AI по-справжньому. Без коду. Субота або неділя.',
    keywords: 'AI воркшоп, Claude Code, MCP, агенти, автоматизація, без коду, корпоративне навчання, Саша Бондар',
    breadcrumbHome: 'Головна',
    breadcrumbPage: 'Корпоративний AI Workshop',
    kicker: 'Корпоративний AI Workshop · один повний день · команда 5–10 людей',
    heroTitle: 'Від LLM‑чату — до AI‑рішень',
    heroLead: 'Воркшоп для вашої команди на один цілий день. Збираємось у вас в офісі або за містом, беремо конкретну задачу, з якою ваші люди стикаються в роботі, і прямо на зустрічі робимо під неї рішення: автоматизацію, обробку даних чи невеликий інструмент. І говоримо не лише про інструменти, а про підхід: як працювати з AI так, щоб це лишалось актуальним і для інструментів, яких ще не створили.',
    heroFacts: ['Субота або неділя', 'Команда 5–10 людей', '$2000 за воркшоп'],
    heroCta: 'Домовитись про дату',
    forHeading: 'Для кого',
    forText: [
      'Ви керуєте командою чи відділом. У ваших людей щодня є задачі, де AI міг би допомогти, але поки не зрозуміло, як саме. Хтось спробував чат і не вразився. Хтось користується багато і хоче вміти більше. А ви хочете, щоб рухалась уся команда, а не двоє ентузіастів.',
      'Вміти програмувати нікому з команди не треба. Без коду навіть цікавіше: люди дивляться на свою щоденну роботу збоку і бачать, що з неї можна спокійно віддати AI.'
    ],
    forDeptsLabel: 'Підійде будь-якій команді:',
    depts: ['Бухгалтерія', 'Виробництво', 'Фінанси', 'Продажі', 'Підтримка', 'Документація'],
    howHeading: 'Як проходить',
    howIntro: 'Орієнтовна програма. Починаємо о десятій-одинадцятій ранку.',
    schedule: [
      { time: '1–2 год', title: 'Старт: філософія роботи з AI', text: 'Не які кнопки натискати, а як влаштована ця робота: що змінюється від інструменту до інструменту, а що лишається. Ці закономірності працюватимуть і для моделей та агентів, які з\'являться далі. Дивимось, хто і як користується зараз, розбираємо термінологію та основний інструментарій.' },
      { time: '', title: 'Вибір задачі', text: 'Допомагаю кожному вибрати ідею: автоматизація, сервіс чи невеликий додаток під власну роботу.' },
      { time: '45–60 хв', title: 'Перерва', text: '' },
      { time: '30–40 хв', title: 'Демо', text: 'Збираю додаток чи автоматизацію наочно, від задачі до результату.' },
      { time: '2–4 год', title: 'Робота над проєктами', text: 'Вільніший режим, з перервами. Я поруч, допомагаю кожному.' },
      { time: '1 год', title: 'Фінальне демо', text: 'Кожен показує, що вийшло.' }
    ],
    whereHeading: 'Де проходить',
    whereText: [
      'Це вихідний, тож один варіант — ваш офіс: я приїду. Але краще працює інший: виїхати на день за місто, туди, де є вид на природу і все потрібне для роботи — стіл, екран, інтернет. Зміна обстановки допомагає подивитись на звичну роботу збоку, а саме в цьому суть дня.',
      'Можу запропонувати кілька місць.'
    ],
    toolsText: 'Дорогою покажу інструменти, якими користуюсь сам: Claude Code, MCP, агенти. Без занудства, лише те, що справді стане в пригоді.',
    tools: ['Claude Code', 'MCP', 'Агенти'],
    resultHeading: 'З чим ви підете',
    results: [
      'Як ставити задачу AI і планувати рішення, а не випрошувати відповідь по шматочках.',
      'Як працювати так, щоб AI не губився і робив саме те, що вам потрібно.',
      'Поставите Claude Code і познайомитесь з терміналом.',
      'Сміливість братися за амбітні задачі.'
    ],
    hostHeading: 'Ведучий',
    hostName: 'Саша Бондар',
    hostText: [
      'Я вже давно не пишу код руками — його пише AI. Цінне тепер інше: помітити задачу, вирішити, чи варто її взагалі вирішувати, розкласти на складові, спроєктувати рішення, зробити його, зрозуміти, чого ми навчились у процесі, і переробити вже з цими знаннями. А потім вбудувати це в робочий процес. Помітили, що тут немає етапу «писати код»?',
      'Я пишу про це книжку <a href="/uk/variety">«Необхідне різноманіття»</a>, проводжу воркшопи і щодня бачу, як AI змінює те, скільки може зробити одна людина. На воркшопі показую цей процес на реальному прикладі.'
    ],
    testimonialsHeading: 'Відгуки учасників',
    testimonials: [],
    testimonialsEmpty: 'Тут будуть відгуки учасників.',
    priceHeading: 'Формат і ціна',
    priceFacts: [
      ['Тривалість', 'один повний день'],
      ['День', 'субота або неділя'],
      ['Група', '5–10 людей'],
      ['Місце', 'ваш офіс або за містом'],
      ['Ціна', '$2000 за воркшоп']
    ],
    priceNote: 'Напишіть, яка задача болить у вашій команді, і оберемо дату.',
    ctaEmail: 'obondar@gmail.com',
    contactLabel: 'Пишіть мені:'
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
