export interface Memory {
  id: string;
  title: string;
  subTitle: string;
  description: string;
  date: string;
  imageUrl: string;
  videoUrl?: string; // Optional mockup video url
  category: string;
  location: string;
}

export const CAMPUS_MEMORIES: Memory[] = [
  {
    id: "m7",
    title: "好友",
    subTitle: "ovo",
    description: "少有的机会和高中同学出玩",
    date: "2025",
    imageUrl: "/media/image-m7.jpg",
    category: "出行",
    location: "只有河南",
    videoUrl: ""
  },
  {
    id: "m4",
    title: "吉他",
    subTitle: "guitar",
    description: "没想到竟然是我最后一次弹的吉他了",
    date: "2024",
    imageUrl: "/media/image-m4.jpg",
    category: "娱乐",
    location: "家",
    videoUrl: ""
  },
  {
    id: "m1",
    title: "小作小作",
    subTitle: "SMELL",
    description: "苦苦的非遗美术生",
    date: "2024",
    imageUrl: "/media/image-m1.jpg",
    category: "非遗",
    location: "家",
    videoUrl: ""
  },
  {
    id: "m4_video",
    title: "吉他视频",
    subTitle: "GUITAR VIDEO",
    description: "静夜吉他弹唱，指尖流淌的青春音色",
    date: "2024",
    imageUrl: "/media/image-m4.jpg",
    category: "娱乐",
    location: "家",
    videoUrl: "/media/video-m4.mp4"
  },
  {
    id: "m3",
    title: "健身",
    subTitle: "ovo",
    description: "少有的记录肌肉，虽然只去过两次健身房",
    date: "2026",
    imageUrl: "/media/image-m3.jpg",
    category: "记忆",
    location: "思迈",
    videoUrl: ""
  },
  {
    id: "m2",
    title: "小侄女",
    subTitle: "ovo",
    description: "终于牵上小侄女的手了",
    date: "2026",
    imageUrl: "/media/image-m2.jpg",
    category: "生活",
    location: "黄河边",
    videoUrl: ""
  },
  {
    id: "m5",
    title: "老妈",
    subTitle: "ovo",
    description: "爱你老妈",
    date: "2025",
    imageUrl: "/media/image-m5.jpg",
    category: "老妈",
    location: "人民公园",
    videoUrl: ""
  },
  {
    id: "m15",
    title: "毕业答辩合影",
    subTitle: "FRIEND",
    description: "一转眼就大三大四了，珍惜珍惜",
    date: "2026",
    imageUrl: "/media/image-m15.jpg",
    category: "毕业",
    location: "图书馆",
    videoUrl: ""
  },
  {
    id: "m14",
    title: "一帮子",
    subTitle: "DANCE",
    description: "半夜路边斗舞",
    date: "2026",
    imageUrl: "/media/image-m14.jpg",
    category: "记忆",
    location: "绿地新都汇",
    videoUrl: ""
  },
  {
    id: "m8",
    title: "室友",
    subTitle: "vov",
    description: "第一次独立自驾，室友同行",
    date: "2026",
    imageUrl: "/media/image-m8.jpg",
    category: "出行",
    location: "洛阳",
    videoUrl: ""
  },
  {
    id: "m6",
    title: "老妈",
    subTitle: "ovo",
    description: "爱你老妈",
    date: "2025",
    imageUrl: "/media/image-m6.jpg",
    category: "老妈",
    location: "人民公园",
    videoUrl: ""
  },
  {
    id: "m11_video",
    title: "跳舞视频",
    subTitle: "DANCE VIDEO",
    description: "热烈的跳舞舞台排练合影及视频",
    date: "2026",
    imageUrl: "/media/image-m11.jpg",
    category: "娱乐",
    location: "财大",
    videoUrl: "/media/video-m11.mp4"
  },
  {
    id: "m9",
    title: "室友",
    subTitle: "vov",
    description: "记录记录",
    date: "2025",
    imageUrl: "/media/image-m9.jpg",
    category: "出行",
    location: "洛阳",
    videoUrl: ""
  },
  {
    id: "m12",
    title: "老队长",
    subTitle: "vov",
    description: "见面次数越来越少了，珍惜每一天",
    date: "2026",
    imageUrl: "/media/image-m12.jpg",
    category: "记忆",
    location: "体育馆",
    videoUrl: ""
  },
  {
    id: "m13",
    title: "和gz的徒弟",
    subTitle: "ovo",
    description: "第一次当上教练🙂",
    date: "2026",
    imageUrl: "/media/image-m13.jpg",
    category: "记忆",
    location: "体育馆",
    videoUrl: ""
  },
  {
    id: "m11",
    title: "跳舞",
    subTitle: "DANCE",
    description: "跳舞好玩，好玩",
    date: "2026",
    imageUrl: "/media/image-m11.jpg",
    category: "娱乐",
    location: "财大",
    videoUrl: ""
  },
  {
    id: "m16",
    title: "比赛",
    subTitle: "ovo",
    description: "大学难得的惬意时光",
    date: "2026",
    imageUrl: "/media/image-m16.jpg",
    category: "记忆",
    location: "河财",
    videoUrl: ""
  },
  {
    id: "m2_video",
    title: "小侄女视频",
    subTitle: "NIECE VIDEO",
    description: "终于牵上小侄女的手了，萌萌的欢声笑语",
    date: "2026",
    imageUrl: "/media/image-m2.jpg",
    category: "生活",
    location: "黄河边",
    videoUrl: "/media/video-m2.mp4"
  },
  {
    id: "m1779475753357",
    title: "新记忆片段",
    subTitle: "oco",
    description: "简历就不放了，我也要成长🙂",
    date: "2026.06.01",
    imageUrl: "/media/image-m1779475753357.jpg",
    category: "回忆",
    location: "静2",
    videoUrl: ""
  },
  {
    id: "m3_video",
    title: "健身视频",
    subTitle: "GYM VIDEO",
    description: "少有的记录肌肉，挥洒青春汗水的拼搏瞬间",
    date: "2026",
    imageUrl: "/media/image-m3.jpg",
    category: "记忆",
    location: "思迈",
    videoUrl: "/media/video-m3.mp4"
  },
  {
    id: "m1779475655755",
    title: "再一张",
    subTitle: "ovo",
    description: "快快长大，也不要长大",
    date: "2026",
    imageUrl: "/media/image-m1779475655755.jpg",
    category: "回忆",
    location: "人民公园",
    videoUrl: ""
  },
  {
    id: "m10",
    title: "暴雨红船",
    subTitle: "STORMY AFTERNOON",
    description: "突发乌云密布，倾盆暴雨。四个人共撑两把伞被淋成落汤鸡，在路旁小木亭下听着隆隆雷雨，笑得直不起腰。",
    date: "2024.07.05",
    imageUrl: "/media/image-m10.jpg",
    category: "生活",
    location: "镜湖回廊",
    videoUrl: ""
  }
];

export interface Stage {
  id: string;
  name: string;
  english: string;
  percent: number;
  description: string;
}

export const COMMEMORATION_STAGES: Stage[] = [
  {
    id: "arrival",
    name: "迎来谷",
    english: "VALLEY: ARRIVAL",
    percent: 0,
    description: "“双击繁星海底，唤醒被尘封的记忆卡片”"
  },
  {
    id: "cross",
    name: "交叉谷",
    english: "VALLEY: CROSS",
    percent: 21,
    description: "“起点的轨迹，在十字路口相汇的温柔相遇”"
  },
  {
    id: "gather",
    name: "聚合谷",
    english: "VALLEY: GATHER",
    percent: 43,
    description: "“热烈的陪伴，温存那些并肩前行的琐碎点滴”"
  },
  {
    id: "fan",
    name: "扇面谷",
    english: "VALLEY: FAN",
    percent: 65,
    description: "“青春的折射，在时光羽翼中散落的多彩绚丽”"
  },
  {
    id: "grid",
    name: "网格谷",
    english: "VALLEY: GRID",
    percent: 80,
    description: "“岁月的画册，井然安顿着奋斗拼搏的所有日夜”"
  },
  {
    id: "spiral",
    name: "螺旋谷",
    english: "VALLEY: SPIRAL",
    percent: 92,
    description: "“流转的长河，我们在无休时光漩涡里高歌狂奔”"
  },
  {
    id: "depart",
    name: "离别谷",
    english: "VALLEY: DEPART",
    percent: 100,
    description: "“拨穗与道别，所有的偶然终汇聚成命定的回响”"
  }
];
