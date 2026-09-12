import "server-only";

// Full question bank, INCLUDING correct answers and explanations.
// Import this only from server code (route handlers) — never from a
// client component — so answers never ship in the browser JS bundle.
// Keep this in sync with lib/questions.client.ts (q + options only).

export type Question = {
  q: string;
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  exp: string;
};

export const QUESTION_SECONDS = 20;

export const questions: Question[] = [
  {
    q: "“教堂”(Church Building) 与 “教会”(The Church) 的最大区别是什么？",
    options: [
      "两者完全没有区别，是同义词",
      "教堂只在主日开放，教会每天开放",
      "教堂是砖瓦建筑，教会是被召集的信徒身体",
      "教堂属于神父，教会属于平信徒",
    ],
    correct: 2,
    exp: "“教堂”指向砖瓦建造的物理建筑物；而“教会”（Ecclesia）意为“被天主召集的子民”，是活生生的信仰共同体。",
  },
  {
    q: "《尼西亚·君士坦丁堡信经》中宣告天主教会的“四大特征”是什么？",
    options: [
      "仁慈、和平、喜乐、忠贞",
      "唯一、至圣、至公、从宗徒传下来的",
      "圣父、圣子、圣神、圣母",
      "祈祷、弥撒、圣事、爱德",
    ],
    correct: 1,
    exp: "天主教会的四大特征为：唯一(One)、至圣(Holy)、至公(Catholic)与从宗徒传下来的(Apostolic)。",
  },
  {
    q: "天主教圣秩圣事 (Holy Orders) 包含哪三个阶层？",
    options: [
      "教宗、枢机、主教",
      "神父、修士、修女",
      "主教、神父、平信徒",
      "主教、司铎/神父、执事",
    ],
    correct: 3,
    exp: "圣秩圣事的三大阶层为：主教（Episcopate）、司铎/神父（Presbyterate）及执事（Diaconate）。",
  },
  {
    q: "在堂区中，依据天主教法典设立，协助神父监督主日奉献与财务预决算的是？",
    options: [
      "堂区财务委员会 (PFC)",
      "堂区牧灵议会 (PPC)",
      "圣文生会 (SSVP)",
      "圣母军",
    ],
    correct: 0,
    exp: "堂区财务委员会 (Parish Finance Council) 专门由具备财务/法律背景的教友协助神父管理堂区财产与合规。",
  },
  {
    q: "平信徒占教会人口的 99%，在世俗阵地中分享基督的哪三重职份？",
    options: [
      "创世职、救赎职、圣化职",
      "主教职、神父职、执事职",
      "司祭职、先知职、王者职",
      "祈祷职、工作职、休息职",
    ],
    correct: 2,
    exp: "平信徒在世俗中分享基督的三重职份：普通司祭职（日常奉献）、先知职（福音作证）与王者职（服务社会）。",
  },
  {
    q: "哪一个堂区组别主要负责为儿童及青少年提供初领圣体与坚振圣事的信仰培育？",
    options: [
      "成人慕道班 (RCIA)",
      "主日学教理组 (Sunday School)",
      "辅祭团",
      "圣母军",
    ],
    correct: 1,
    exp: "主日学教理组为儿童及青少年提供系统性的信仰培育，是信仰代代相传的关键桥梁。",
  },
  {
    q: "专门探访与援助堂区附近贫困家庭、孤寡老人与病患的爱德善会是？",
    options: ["读经员组", "辅祭团", "圣歌团", "圣文生会 (SSVP)"],
    correct: 3,
    exp: "圣文生会 (Society of St. Vincent de Paul) 不分种族与宗教，向弱者发放物资与助学金，活出爱德。",
  },
  {
    q: "在弥撒中协助神父举行祭台礼仪、培养敬虔态度的青少年团体被称为？",
    options: ["辅祭团 (Altar Servers)", "读经员组", "礼宾组", "圣歌团"],
    correct: 0,
    exp: "辅祭团在祭台前协助神父举行神圣弥撒，是许多青少年深植信仰的重要服务团体。",
  },
  {
    q: "天主教强调从首任教宗圣伯多禄至今两千年未曾中断的祝圣链条被称为？",
    options: [
      "梵二大公会议",
      "隐修会制度",
      "宗徒继承 (Apostolic Succession)",
      "圣体保领",
    ],
    correct: 2,
    exp: "宗徒继承 (Apostolic Succession) 保证了天主教教理的纯洁、圣事的有效性以及普世信徒的合一。",
  },
  {
    q: "圣保禄宗徒在《哥林多前书》(12:27) 中，将堂区里不同恩赐的信徒比作什么？",
    options: [
      "城堡里不同的砖石",
      "基督身体上的不同肢体",
      "军队里不同的士兵",
      "公司里不同的员工",
    ],
    correct: 1,
    exp: "“你们就是基督的身体，各自都是肢体。”教会中每个人性格恩赐不同，但都在爱中互相扶持建立奥体。",
  },
];
