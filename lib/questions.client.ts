// Client-safe question bank: question text + options ONLY, no correct
// answer or explanation. Deliberately duplicated from questions.server.ts
// rather than derived from it, so the answers never end up embedded in
// this module's source and therefore never ship in the browser bundle.
// Keep the q/options text in sync with lib/questions.server.ts.

export type PublicQuestion = {
  q: string;
  options: [string, string, string, string];
};

export const QUESTION_SECONDS = 20;

export const publicQuestions: PublicQuestion[] = [
  {
    q: "“教堂”(Church Building) 与 “教会”(The Church) 的最大区别是什么？",
    options: [
      "两者完全没有区别，是同义词",
      "教堂只在主日开放，教会每天开放",
      "教堂是砖瓦建筑，教会是被召集的信徒身体",
      "教堂属于神父，教会属于平信徒",
    ],
  },
  {
    q: "《尼西亚·君士坦丁堡信经》中宣告天主教会的“四大特征”是什么？",
    options: [
      "仁慈、和平、喜乐、忠贞",
      "唯一、至圣、至公、从宗徒传下来的",
      "圣父、圣子、圣神、圣母",
      "祈祷、弥撒、圣事、爱德",
    ],
  },
  {
    q: "天主教圣秩圣事 (Holy Orders) 包含哪三个阶层？",
    options: [
      "教宗、枢机、主教",
      "神父、修士、修女",
      "主教、神父、平信徒",
      "主教、司铎/神父、执事",
    ],
  },
  {
    q: "在堂区中，依据天主教法典设立，协助神父监督主日奉献与财务预决算的是？",
    options: [
      "堂区财务委员会 (PFC)",
      "堂区牧灵议会 (PPC)",
      "圣文生会 (SSVP)",
      "圣母军",
    ],
  },
  {
    q: "平信徒占教会人口的 99%，在世俗阵地中分享基督的哪三重职份？",
    options: [
      "创世职、救赎职、圣化职",
      "主教职、神父职、执事职",
      "司祭职、先知职、王者职",
      "祈祷职、工作职、休息职",
    ],
  },
  {
    q: "哪一个堂区组别主要负责为儿童及青少年提供初领圣体与坚振圣事的信仰培育？",
    options: [
      "成人慕道班 (RCIA)",
      "主日学教理组 (Sunday School)",
      "辅祭团",
      "圣母军",
    ],
  },
  {
    q: "专门探访与援助堂区附近贫困家庭、孤寡老人与病患的爱德善会是？",
    options: ["读经员组", "辅祭团", "圣歌团", "圣文生会 (SSVP)"],
  },
  {
    q: "在弥撒中协助神父举行祭台礼仪、培养敬虔态度的青少年团体被称为？",
    options: ["辅祭团 (Altar Servers)", "读经员组", "礼宾组", "圣歌团"],
  },
  {
    q: "天主教强调从首任教宗圣伯多禄至今两千年未曾中断的祝圣链条被称为？",
    options: [
      "梵二大公会议",
      "隐修会制度",
      "宗徒继承 (Apostolic Succession)",
      "圣体保领",
    ],
  },
  {
    q: "圣保禄宗徒在《哥林多前书》(12:27) 中，将堂区里不同恩赐的信徒比作什么？",
    options: [
      "城堡里不同的砖石",
      "基督身体上的不同肢体",
      "军队里不同的士兵",
      "公司里不同的员工",
    ],
  },
];
