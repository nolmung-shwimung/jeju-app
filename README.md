# 놀멍쉬멍 nolmung-shwimung
> 제주대학교 캡스톤디자인2 – 키워드 기반 제주 여행 추천 웹 서비스

---

## 📌 프로젝트 개요
**Nolmung-Shwimung(놀멍쉬멍)** 은 사용자가 원하는 **키워드**를 기반으로  
제주도의 **관광지 / 숙박 / 식당**을 추천하고, 추천된 장소들을 바탕으로  
**최단거리 최적 코스**까지 제공하는 웹 서비스입니다.  

- **놀멍 파트** : 키워드 기반 관광지 추천  
- **쉬멍 파트** : 키워드 기반 숙소·식당 추천  
- **최적화 기능** : 추천된 장소들을 효율적인 경로로 연결하여 여행 코스 제공  

---

## 🎯 프로젝트 목표
- 키워드 기반 **맞춤형 추천 시스템** 제공  
- 단순 나열이 아닌 **경로 최적화 알고리즘 적용**  
- 제주 관광 활성화 및 사용자 편의성 증대  

---

## ⚙️ 주요 기능
1. 키워드 선택 UI 제공 (ex. 가족여행, 숲, 바다, 맛집, 애견동반 등)  
2. 관광지/숙소/식당 추천 (놀멍 / 쉬멍)  
3. 추천 장소 기반 최단거리 여행 코스 생성  
4. 웹 서비스 형태로 결과 제공  

---

## 🛠️ 기술 스택
- **Frontend** : React, TailwindCSS  
- **Backend** : FastAPI / Node.js (예정)  
- **Database** : MySQL or PostgreSQL  
- **ML/Algorithm** : Python, Scikit-learn, XGBoost, 경로 최적화 알고리즘  
- **Infra/Collab** : GitHub, Notion, Figma  

---

## 👥 팀 구성
- **데이터 담당** : 관광지/숙박/식당 데이터 수집 및 전처리  
- **알고리즘 담당** : 키워드 기반 추천, 최적 경로 알고리즘 개발  
- **웹 개발 담당** : 프론트엔드 & 백엔드 구현, UI/UX 설계  

---

## 🚀 기대 효과
- 사용자 맞춤형 여행 경험 제공 (개인 취향 반영)  
- 효율적인 동선 제공으로 시간·비용 절감  
- 지역 관광 활성화 및 서비스 확장 가능성  

---

## 📅 진행 일정 (예시)
- **1~2주차** : 요구사항 정의, 데이터 수집  
- **3~5주차** : DB 설계, 추천 알고리즘 구현  
- **6~8주차** : 웹 서비스 프로토타입 개발  
- **9~12주차** : 최적화 알고리즘 적용 및 통합  
- **13~15주차** : 테스트 및 최종 발표  

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
# jeju-app
