/**
 * document_data.js  ─  홍삼스파 ERP 문서관리 모듈 양식 데이터
 * 100인 이하 소규모 스파/리조트 사업장에서 통용되는 양식 200+건
 *
 * 카테고리 구조:
 *   all           = 전체 문서
 *   policy        = 사규 및 규정
 *   accounting    = 경영 및 회계
 *   hr            = 인사 (HR) 양식
 *   facility      = 시설 및 공무 자료
 *   operation     = 매장 운영 매뉴얼
 *   sales         = 영업 및 마케팅
 *   safety        = 안전 및 위생
 *   general       = 총무/일반 양식
 *   it            = IT/정보보안
 *   contract      = 계약서/법무
 */

const DOC_CATEGORIES = [
    { id: 'all',        label: '전체 문서',          icon: 'fa-folder-open',    restricted: false, count: 0 },
    { id: 'policy',     label: '사규 및 규정',       icon: 'fa-lock',           restricted: true },
    { id: 'accounting', label: '경영 및 회계',       icon: 'fa-lock',           restricted: true },
    { id: 'hr',         label: '인사 (HR) 양식',     icon: 'fa-folder',         restricted: false },
    { id: 'facility',   label: '시설 및 공무 자료',  icon: 'fa-folder',         restricted: false },
    { id: 'operation',  label: '매장 운영 매뉴얼',   icon: 'fa-folder',         restricted: false },
    { id: 'sales',      label: '영업 및 마케팅',     icon: 'fa-folder',         restricted: false },
    { id: 'safety',     label: '안전 및 위생',       icon: 'fa-folder',         restricted: false },
    { id: 'general',    label: '총무/일반 양식',     icon: 'fa-folder',         restricted: false },
    { id: 'it',         label: 'IT/정보보안',        icon: 'fa-folder',         restricted: false },
    { id: 'contract',   label: '계약서/법무',        icon: 'fa-folder',         restricted: false },
];

// ── 양식 데이터 (200+건) ──────────────────────────────────────
const DOC_TEMPLATES = [
    // ═══════════════════════════════════════════════════════════
    // 1. 사규 및 규정 (policy) — 20건
    // ═══════════════════════════════════════════════════════════
    { name: '취업규칙_2026년_개정본.pdf', cat: 'policy', date: '2026.01.05', user: '진양우 (대표)', size: '3.2 MB', ext: 'pdf' },
    { name: '인사규정_제5차_개정.pdf', cat: 'policy', date: '2026.01.05', user: '진양우 (대표)', size: '1.8 MB', ext: 'pdf' },
    { name: '급여규정_2026.pdf', cat: 'policy', date: '2026.01.05', user: '진양우 (대표)', size: '1.2 MB', ext: 'pdf' },
    { name: '복무규정_근무시간_교대제.pdf', cat: 'policy', date: '2025.12.20', user: '김지원 (지원팀)', size: '980 KB', ext: 'pdf' },
    { name: '퇴직금규정.pdf', cat: 'policy', date: '2025.12.20', user: '김지원 (지원팀)', size: '650 KB', ext: 'pdf' },
    { name: '상벌규정.pdf', cat: 'policy', date: '2025.11.10', user: '진양우 (대표)', size: '720 KB', ext: 'pdf' },
    { name: '비밀유지및보안규정.pdf', cat: 'policy', date: '2025.11.10', user: '진양우 (대표)', size: '540 KB', ext: 'pdf' },
    { name: '성희롱예방지침.pdf', cat: 'policy', date: '2025.10.01', user: '김지원 (지원팀)', size: '480 KB', ext: 'pdf' },
    { name: '개인정보처리방침.pdf', cat: 'policy', date: '2025.10.01', user: '진양우 (대표)', size: '620 KB', ext: 'pdf' },
    { name: '사내_징계위원회_규정.pdf', cat: 'policy', date: '2025.09.15', user: '진양우 (대표)', size: '380 KB', ext: 'pdf' },
    { name: '직원_복리후생_규정.pdf', cat: 'policy', date: '2025.09.01', user: '김지원 (지원팀)', size: '890 KB', ext: 'pdf' },
    { name: '출장_여비규정.pdf', cat: 'policy', date: '2025.08.20', user: '김지원 (지원팀)', size: '420 KB', ext: 'pdf' },
    { name: '차량_사용규정.pdf', cat: 'policy', date: '2025.08.15', user: '김지원 (지원팀)', size: '310 KB', ext: 'pdf' },
    { name: '정보보안_관리규정.pdf', cat: 'policy', date: '2025.07.10', user: '진양우 (대표)', size: '780 KB', ext: 'pdf' },
    { name: '문서_관리규정.pdf', cat: 'policy', date: '2025.07.01', user: '김지원 (지원팀)', size: '560 KB', ext: 'pdf' },
    { name: '안전보건_관리규정.pdf', cat: 'policy', date: '2025.06.20', user: '진양우 (대표)', size: '1.4 MB', ext: 'pdf' },
    { name: '직장_내_괴롭힘_예방지침.pdf', cat: 'policy', date: '2025.06.15', user: '김지원 (지원팀)', size: '520 KB', ext: 'pdf' },
    { name: '경조금_지급규정.pdf', cat: 'policy', date: '2025.05.20', user: '김지원 (지원팀)', size: '280 KB', ext: 'pdf' },
    { name: '포상_및_표창_규정.pdf', cat: 'policy', date: '2025.05.10', user: '진양우 (대표)', size: '340 KB', ext: 'pdf' },
    { name: '사내교육_훈련규정.pdf', cat: 'policy', date: '2025.04.20', user: '김지원 (지원팀)', size: '680 KB', ext: 'pdf' },

    // ═══════════════════════════════════════════════════════════
    // 2. 경영 및 회계 (accounting) — 25건
    // ═══════════════════════════════════════════════════════════
    { name: '지출결의서_양식.xlsx', cat: 'accounting', date: '2026.04.10', user: '김지원 (지원팀)', size: '85 KB', ext: 'xlsx' },
    { name: '수입결의서_양식.xlsx', cat: 'accounting', date: '2026.04.10', user: '김지원 (지원팀)', size: '78 KB', ext: 'xlsx' },
    { name: '법인카드_사용내역서.xlsx', cat: 'accounting', date: '2026.04.08', user: '김지원 (지원팀)', size: '92 KB', ext: 'xlsx' },
    { name: '일일_매출_보고서_양식.xlsx', cat: 'accounting', date: '2026.04.01', user: '김지원 (지원팀)', size: '110 KB', ext: 'xlsx' },
    { name: '월간_매출_보고서_양식.xlsx', cat: 'accounting', date: '2026.04.01', user: '김지원 (지원팀)', size: '145 KB', ext: 'xlsx' },
    { name: '분기_경영실적_보고서.xlsx', cat: 'accounting', date: '2026.03.31', user: '진양우 (대표)', size: '320 KB', ext: 'xlsx' },
    { name: '연간_예산_편성표_2026.xlsx', cat: 'accounting', date: '2026.01.10', user: '진양우 (대표)', size: '480 KB', ext: 'xlsx' },
    { name: '부서별_예산_집행현황표.xlsx', cat: 'accounting', date: '2026.03.20', user: '김지원 (지원팀)', size: '210 KB', ext: 'xlsx' },
    { name: '거래명세서_양식.xlsx', cat: 'accounting', date: '2026.03.15', user: '김지원 (지원팀)', size: '68 KB', ext: 'xlsx' },
    { name: '세금계산서_발행대장.xlsx', cat: 'accounting', date: '2026.03.10', user: '김지원 (지원팀)', size: '95 KB', ext: 'xlsx' },
    { name: '간이영수증_양식.pdf', cat: 'accounting', date: '2026.02.15', user: '김지원 (지원팀)', size: '42 KB', ext: 'pdf' },
    { name: '급여대장_양식.xlsx', cat: 'accounting', date: '2026.02.01', user: '김지원 (지원팀)', size: '180 KB', ext: 'xlsx' },
    { name: '퇴직금_정산서_양식.xlsx', cat: 'accounting', date: '2026.01.20', user: '김지원 (지원팀)', size: '120 KB', ext: 'xlsx' },
    { name: '4대보험_취득신고서_양식.hwp', cat: 'accounting', date: '2026.01.15', user: '김지원 (지원팀)', size: '140 KB', ext: 'hwp' },
    { name: '4대보험_상실신고서_양식.hwp', cat: 'accounting', date: '2026.01.15', user: '김지원 (지원팀)', size: '135 KB', ext: 'hwp' },
    { name: '원천징수이행상황_신고서.pdf', cat: 'accounting', date: '2025.12.28', user: '김지원 (지원팀)', size: '280 KB', ext: 'pdf' },
    { name: '부가가치세_신고서_양식.pdf', cat: 'accounting', date: '2025.12.20', user: '김지원 (지원팀)', size: '320 KB', ext: 'pdf' },
    { name: '법인세_신고_체크리스트.xlsx', cat: 'accounting', date: '2025.12.15', user: '김지원 (지원팀)', size: '95 KB', ext: 'xlsx' },
    { name: '교통비_정산서_양식.xlsx', cat: 'accounting', date: '2025.11.20', user: '김지원 (지원팀)', size: '62 KB', ext: 'xlsx' },
    { name: '출장비_정산서_양식.xlsx', cat: 'accounting', date: '2025.11.15', user: '김지원 (지원팀)', size: '75 KB', ext: 'xlsx' },
    { name: '소액경비_청구서.xlsx', cat: 'accounting', date: '2025.10.20', user: '김지원 (지원팀)', size: '55 KB', ext: 'xlsx' },
    { name: '재무상태표_양식.xlsx', cat: 'accounting', date: '2025.10.01', user: '진양우 (대표)', size: '250 KB', ext: 'xlsx' },
    { name: '손익계산서_양식.xlsx', cat: 'accounting', date: '2025.10.01', user: '진양우 (대표)', size: '230 KB', ext: 'xlsx' },
    { name: '현금출납장_양식.xlsx', cat: 'accounting', date: '2025.09.15', user: '김지원 (지원팀)', size: '88 KB', ext: 'xlsx' },
    { name: '매입매출장_양식.xlsx', cat: 'accounting', date: '2025.09.10', user: '김지원 (지원팀)', size: '92 KB', ext: 'xlsx' },

    // ═══════════════════════════════════════════════════════════
    // 3. 인사 (HR) 양식 (hr) — 35건
    // ═══════════════════════════════════════════════════════════
    { name: '인사기록카드_양식.xlsx', cat: 'hr', date: '2026.04.18', user: '김지원 (지원팀)', size: '1.1 MB', ext: 'xlsx' },
    { name: '근로계약서_정규직_양식.hwp', cat: 'hr', date: '2026.04.14', user: '진양우 (대표)', size: '452 KB', ext: 'hwp' },
    { name: '근로계약서_계약직_양식.hwp', cat: 'hr', date: '2026.04.14', user: '진양우 (대표)', size: '440 KB', ext: 'hwp' },
    { name: '근로계약서_단시간근로자.hwp', cat: 'hr', date: '2026.04.14', user: '진양우 (대표)', size: '420 KB', ext: 'hwp' },
    { name: '근로계약서_아르바이트_양식.hwp', cat: 'hr', date: '2026.04.14', user: '진양우 (대표)', size: '380 KB', ext: 'hwp' },
    { name: '연차유급휴가_신청서.xlsx', cat: 'hr', date: '2026.04.10', user: '김지원 (지원팀)', size: '55 KB', ext: 'xlsx' },
    { name: '경조사_신청서_양식.xlsx', cat: 'hr', date: '2026.03.20', user: '김지원 (지원팀)', size: '48 KB', ext: 'xlsx' },
    { name: '근태기록_월간대장.xlsx', cat: 'hr', date: '2026.03.15', user: '김지원 (지원팀)', size: '120 KB', ext: 'xlsx' },
    { name: '시간외근무_신청서.xlsx', cat: 'hr', date: '2026.03.10', user: '김지원 (지원팀)', size: '52 KB', ext: 'xlsx' },
    { name: '연장야간_휴일근무대장.xlsx', cat: 'hr', date: '2026.03.05', user: '김지원 (지원팀)', size: '85 KB', ext: 'xlsx' },
    { name: '퇴직원_양식.hwp', cat: 'hr', date: '2026.02.28', user: '김지원 (지원팀)', size: '180 KB', ext: 'hwp' },
    { name: '업무인수인계서_양식.xlsx', cat: 'hr', date: '2026.02.25', user: '김지원 (지원팀)', size: '95 KB', ext: 'xlsx' },
    { name: '재직증명서_양식.hwp', cat: 'hr', date: '2026.02.20', user: '김지원 (지원팀)', size: '120 KB', ext: 'hwp' },
    { name: '경력증명서_양식.hwp', cat: 'hr', date: '2026.02.20', user: '김지원 (지원팀)', size: '115 KB', ext: 'hwp' },
    { name: '재직증명서_영문_양식.docx', cat: 'hr', date: '2026.02.18', user: '김지원 (지원팀)', size: '88 KB', ext: 'docx' },
    { name: '채용_면접평가표.xlsx', cat: 'hr', date: '2026.02.15', user: '김지원 (지원팀)', size: '72 KB', ext: 'xlsx' },
    { name: '채용_제안서(오퍼레터)_양식.docx', cat: 'hr', date: '2026.02.10', user: '김지원 (지원팀)', size: '95 KB', ext: 'docx' },
    { name: '수습기간_평가서.xlsx', cat: 'hr', date: '2026.02.05', user: '김지원 (지원팀)', size: '68 KB', ext: 'xlsx' },
    { name: '인사발령_통보서_양식.hwp', cat: 'hr', date: '2026.01.28', user: '진양우 (대표)', size: '140 KB', ext: 'hwp' },
    { name: '연봉계약서_양식.hwp', cat: 'hr', date: '2026.01.25', user: '진양우 (대표)', size: '180 KB', ext: 'hwp' },
    { name: '비밀유지서약서.hwp', cat: 'hr', date: '2026.01.20', user: '진양우 (대표)', size: '120 KB', ext: 'hwp' },
    { name: '개인정보수집이용_동의서.hwp', cat: 'hr', date: '2026.01.15', user: '김지원 (지원팀)', size: '95 KB', ext: 'hwp' },
    { name: '교육훈련_참석확인서.xlsx', cat: 'hr', date: '2026.01.10', user: '김지원 (지원팀)', size: '58 KB', ext: 'xlsx' },
    { name: '직원_교육이수_대장.xlsx', cat: 'hr', date: '2025.12.20', user: '김지원 (지원팀)', size: '110 KB', ext: 'xlsx' },
    { name: '휴직_신청서_양식.hwp', cat: 'hr', date: '2025.12.15', user: '김지원 (지원팀)', size: '135 KB', ext: 'hwp' },
    { name: '복직_신청서_양식.hwp', cat: 'hr', date: '2025.12.15', user: '김지원 (지원팀)', size: '130 KB', ext: 'hwp' },
    { name: '출산전후휴가_신청서.hwp', cat: 'hr', date: '2025.12.10', user: '김지원 (지원팀)', size: '140 KB', ext: 'hwp' },
    { name: '육아휴직_신청서.hwp', cat: 'hr', date: '2025.12.10', user: '김지원 (지원팀)', size: '142 KB', ext: 'hwp' },
    { name: '시말서_양식.hwp', cat: 'hr', date: '2025.11.20', user: '김지원 (지원팀)', size: '85 KB', ext: 'hwp' },
    { name: '징계요구서_양식.hwp', cat: 'hr', date: '2025.11.15', user: '진양우 (대표)', size: '120 KB', ext: 'hwp' },
    { name: '직무기술서_양식.xlsx', cat: 'hr', date: '2025.11.10', user: '김지원 (지원팀)', size: '95 KB', ext: 'xlsx' },
    { name: '인사고과_평가표.xlsx', cat: 'hr', date: '2025.10.30', user: '진양우 (대표)', size: '180 KB', ext: 'xlsx' },
    { name: '자기개발_계획서_양식.docx', cat: 'hr', date: '2025.10.20', user: '김지원 (지원팀)', size: '72 KB', ext: 'docx' },
    { name: '연차사용촉진_통보서.hwp', cat: 'hr', date: '2025.10.01', user: '김지원 (지원팀)', size: '95 KB', ext: 'hwp' },
    { name: '퇴사자_장비반납확인서.xlsx', cat: 'hr', date: '2025.09.20', user: '김지원 (지원팀)', size: '48 KB', ext: 'xlsx' },

    // ═══════════════════════════════════════════════════════════
    // 4. 시설 및 공무 자료 (facility) — 25건
    // ═══════════════════════════════════════════════════════════
    { name: '시설_점검일지_양식.xlsx', cat: 'facility', date: '2026.04.15', user: '박철수 (공무팀)', size: '95 KB', ext: 'xlsx' },
    { name: '보일러_점검_체크리스트.xlsx', cat: 'facility', date: '2026.04.10', user: '박철수 (공무팀)', size: '78 KB', ext: 'xlsx' },
    { name: '전기안전_점검표.xlsx', cat: 'facility', date: '2026.04.08', user: '박철수 (공무팀)', size: '82 KB', ext: 'xlsx' },
    { name: '소방시설_점검일지.xlsx', cat: 'facility', date: '2026.04.05', user: '박철수 (공무팀)', size: '88 KB', ext: 'xlsx' },
    { name: '수질검사_성적서_2026Q1.pdf', cat: 'facility', date: '2026.03.28', user: '박철수 (공무팀)', size: '1.5 MB', ext: 'pdf' },
    { name: '승강기_안전검사_확인증.pdf', cat: 'facility', date: '2026.03.15', user: '박철수 (공무팀)', size: '980 KB', ext: 'pdf' },
    { name: '수영장_수질관리_매뉴얼.pdf', cat: 'facility', date: '2026.03.10', user: '박철수 (공무팀)', size: '2.1 MB', ext: 'pdf' },
    { name: '에어컨_정기점검_기록부.xlsx', cat: 'facility', date: '2026.03.05', user: '박철수 (공무팀)', size: '72 KB', ext: 'xlsx' },
    { name: '시설_수리요청서_양식.xlsx', cat: 'facility', date: '2026.02.28', user: '박철수 (공무팀)', size: '55 KB', ext: 'xlsx' },
    { name: '에너지_사용량_월간보고서.xlsx', cat: 'facility', date: '2026.02.25', user: '박철수 (공무팀)', size: '120 KB', ext: 'xlsx' },
    { name: '배관_점검_기록부.xlsx', cat: 'facility', date: '2026.02.20', user: '박철수 (공무팀)', size: '68 KB', ext: 'xlsx' },
    { name: '건물_외관_점검일지.xlsx', cat: 'facility', date: '2026.02.15', user: '박철수 (공무팀)', size: '62 KB', ext: 'xlsx' },
    { name: '정화조_점검_기록부.xlsx', cat: 'facility', date: '2026.02.10', user: '박철수 (공무팀)', size: '58 KB', ext: 'xlsx' },
    { name: '비품_발주서_양식.xlsx', cat: 'facility', date: '2026.02.05', user: '김지원 (지원팀)', size: '65 KB', ext: 'xlsx' },
    { name: '자재_입출고_대장.xlsx', cat: 'facility', date: '2026.01.28', user: '박철수 (공무팀)', size: '95 KB', ext: 'xlsx' },
    { name: '공구_관리대장.xlsx', cat: 'facility', date: '2026.01.20', user: '박철수 (공무팀)', size: '52 KB', ext: 'xlsx' },
    { name: 'CCTV_관리대장_및_열람기록.xlsx', cat: 'facility', date: '2026.01.15', user: '박철수 (공무팀)', size: '78 KB', ext: 'xlsx' },
    { name: '화재_대피_훈련_기록부.xlsx', cat: 'facility', date: '2025.12.20', user: '박철수 (공무팀)', size: '85 KB', ext: 'xlsx' },
    { name: '소방_훈련_계획서.docx', cat: 'facility', date: '2025.12.15', user: '박철수 (공무팀)', size: '120 KB', ext: 'docx' },
    { name: '유틸리티_월간_비용분석표.xlsx', cat: 'facility', date: '2025.11.30', user: '박철수 (공무팀)', size: '140 KB', ext: 'xlsx' },
    { name: '옥상_안전난간_점검일지.xlsx', cat: 'facility', date: '2025.11.20', user: '박철수 (공무팀)', size: '48 KB', ext: 'xlsx' },
    { name: '주차장_관리_체크리스트.xlsx', cat: 'facility', date: '2025.11.10', user: '박철수 (공무팀)', size: '52 KB', ext: 'xlsx' },
    { name: '비상발전기_점검일지.xlsx', cat: 'facility', date: '2025.10.25', user: '박철수 (공무팀)', size: '65 KB', ext: 'xlsx' },
    { name: '냉난방시스템_운용매뉴얼.pdf', cat: 'facility', date: '2025.10.15', user: '박철수 (공무팀)', size: '1.8 MB', ext: 'pdf' },
    { name: '기계설비_유지보수_계약서.pdf', cat: 'facility', date: '2025.09.20', user: '진양우 (대표)', size: '950 KB', ext: 'pdf' },

    // ═══════════════════════════════════════════════════════════
    // 5. 매장 운영 매뉴얼 (operation) — 25건
    // ═══════════════════════════════════════════════════════════
    { name: '사우나_안전관리_매뉴얼_v2.pdf', cat: 'operation', date: '2026.04.16', user: '김지원 (지원팀)', size: '2.4 MB', ext: 'pdf' },
    { name: '루프탑_사우나_운영_SOP.pdf', cat: 'operation', date: '2026.04.12', user: '홍길동 (운영팀)', size: '1.9 MB', ext: 'pdf' },
    { name: '1층_카페_운영매뉴얼.pdf', cat: 'operation', date: '2026.04.08', user: '박영수 (식음료팀)', size: '2.2 MB', ext: 'pdf' },
    { name: '고객_응대_매뉴얼.pdf', cat: 'operation', date: '2026.04.05', user: '김지원 (지원팀)', size: '1.5 MB', ext: 'pdf' },
    { name: 'VIP_의전_프로토콜.pdf', cat: 'operation', date: '2026.03.28', user: '진양우 (대표)', size: '1.2 MB', ext: 'pdf' },
    { name: '고객_불만처리_절차서.pdf', cat: 'operation', date: '2026.03.25', user: '김지원 (지원팀)', size: '880 KB', ext: 'pdf' },
    { name: '영업장_오픈클로즈_체크리스트.xlsx', cat: 'operation', date: '2026.03.20', user: '홍길동 (운영팀)', size: '72 KB', ext: 'xlsx' },
    { name: '일일_업무일지_양식.xlsx', cat: 'operation', date: '2026.03.15', user: '홍길동 (운영팀)', size: '58 KB', ext: 'xlsx' },
    { name: '교대근무_인수인계_양식.xlsx', cat: 'operation', date: '2026.03.10', user: '홍길동 (운영팀)', size: '52 KB', ext: 'xlsx' },
    { name: '고객_입장권_관리대장.xlsx', cat: 'operation', date: '2026.03.05', user: '홍길동 (운영팀)', size: '65 KB', ext: 'xlsx' },
    { name: '물품_분실물_관리대장.xlsx', cat: 'operation', date: '2026.02.28', user: '홍길동 (운영팀)', size: '48 KB', ext: 'xlsx' },
    { name: '탈의실_점검_체크리스트.xlsx', cat: 'operation', date: '2026.02.25', user: '홍길동 (운영팀)', size: '42 KB', ext: 'xlsx' },
    { name: '수건_린넨_재고관리표.xlsx', cat: 'operation', date: '2026.02.20', user: '홍길동 (운영팀)', size: '58 KB', ext: 'xlsx' },
    { name: '어메니티_입출고_대장.xlsx', cat: 'operation', date: '2026.02.15', user: '홍길동 (운영팀)', size: '62 KB', ext: 'xlsx' },
    { name: '바디워시_소모량_관리표.xlsx', cat: 'operation', date: '2026.02.10', user: '홍길동 (운영팀)', size: '45 KB', ext: 'xlsx' },
    { name: 'POS기_사용_매뉴얼.pdf', cat: 'operation', date: '2026.02.05', user: '김지원 (지원팀)', size: '1.8 MB', ext: 'pdf' },
    { name: '현금_시재금_관리대장.xlsx', cat: 'operation', date: '2026.01.28', user: '김지원 (지원팀)', size: '55 KB', ext: 'xlsx' },
    { name: '단체방문_준비_체크리스트.xlsx', cat: 'operation', date: '2026.01.25', user: '홍길동 (운영팀)', size: '68 KB', ext: 'xlsx' },
    { name: '식음료_레시피_관리대장.xlsx', cat: 'operation', date: '2026.01.20', user: '박영수 (식음료팀)', size: '180 KB', ext: 'xlsx' },
    { name: '식자재_발주서_양식.xlsx', cat: 'operation', date: '2026.01.15', user: '박영수 (식음료팀)', size: '72 KB', ext: 'xlsx' },
    { name: '주방_위생_점검표.xlsx', cat: 'operation', date: '2026.01.10', user: '박영수 (식음료팀)', size: '58 KB', ext: 'xlsx' },
    { name: '음식물_폐기_기록부.xlsx', cat: 'operation', date: '2025.12.28', user: '박영수 (식음료팀)', size: '48 KB', ext: 'xlsx' },
    { name: '냉동냉장_온도_점검일지.xlsx', cat: 'operation', date: '2025.12.20', user: '박영수 (식음료팀)', size: '42 KB', ext: 'xlsx' },
    { name: '배달_포장_운영매뉴얼.pdf', cat: 'operation', date: '2025.12.15', user: '박영수 (식음료팀)', size: '780 KB', ext: 'pdf' },
    { name: '유니폼_관리대장_및_세탁현황.xlsx', cat: 'operation', date: '2025.12.10', user: '홍길동 (운영팀)', size: '55 KB', ext: 'xlsx' },

    // ═══════════════════════════════════════════════════════════
    // 6. 영업 및 마케팅 (sales) — 20건
    // ═══════════════════════════════════════════════════════════
    { name: '여행사_제휴_계약서_양식.docx', cat: 'sales', date: '2026.04.12', user: '진양우 (대표)', size: '180 KB', ext: 'docx' },
    { name: '시설_대관_계약서_양식.docx', cat: 'sales', date: '2026.04.10', user: '진양우 (대표)', size: '165 KB', ext: 'docx' },
    { name: '단체방문_예약확인서.xlsx', cat: 'sales', date: '2026.04.08', user: '김지원 (지원팀)', size: '58 KB', ext: 'xlsx' },
    { name: '견적서_양식.xlsx', cat: 'sales', date: '2026.04.05', user: '김지원 (지원팀)', size: '72 KB', ext: 'xlsx' },
    { name: '발주서_양식.xlsx', cat: 'sales', date: '2026.04.01', user: '김지원 (지원팀)', size: '68 KB', ext: 'xlsx' },
    { name: '납품확인서_양식.xlsx', cat: 'sales', date: '2026.03.28', user: '김지원 (지원팀)', size: '55 KB', ext: 'xlsx' },
    { name: '월간_영업보고서_양식.xlsx', cat: 'sales', date: '2026.03.25', user: '김지원 (지원팀)', size: '120 KB', ext: 'xlsx' },
    { name: '고객_만족도_조사표.xlsx', cat: 'sales', date: '2026.03.20', user: '김지원 (지원팀)', size: '82 KB', ext: 'xlsx' },
    { name: '프로모션_기획안_양식.docx', cat: 'sales', date: '2026.03.15', user: '김지원 (지원팀)', size: '95 KB', ext: 'docx' },
    { name: 'SNS_마케팅_콘텐츠_캘린더.xlsx', cat: 'sales', date: '2026.03.10', user: '김지원 (지원팀)', size: '110 KB', ext: 'xlsx' },
    { name: '블로그_체험단_운영계획서.docx', cat: 'sales', date: '2026.03.05', user: '김지원 (지원팀)', size: '88 KB', ext: 'docx' },
    { name: '제휴업체_관리대장.xlsx', cat: 'sales', date: '2026.02.28', user: '김지원 (지원팀)', size: '95 KB', ext: 'xlsx' },
    { name: '이벤트_행사_기획서_양식.docx', cat: 'sales', date: '2026.02.25', user: '김지원 (지원팀)', size: '105 KB', ext: 'docx' },
    { name: '경쟁사_벤치마킹_보고서.docx', cat: 'sales', date: '2026.02.15', user: '김지원 (지원팀)', size: '320 KB', ext: 'docx' },
    { name: '가격표_요금표_양식.xlsx', cat: 'sales', date: '2026.02.10', user: '진양우 (대표)', size: '78 KB', ext: 'xlsx' },
    { name: '회원권_판매관리대장.xlsx', cat: 'sales', date: '2026.02.05', user: '김지원 (지원팀)', size: '85 KB', ext: 'xlsx' },
    { name: '쿠폰_발행_관리대장.xlsx', cat: 'sales', date: '2026.01.25', user: '김지원 (지원팀)', size: '62 KB', ext: 'xlsx' },
    { name: '광고_집행_내역서.xlsx', cat: 'sales', date: '2026.01.20', user: '김지원 (지원팀)', size: '95 KB', ext: 'xlsx' },
    { name: '지역행사_협찬_계획서.docx', cat: 'sales', date: '2026.01.15', user: '진양우 (대표)', size: '110 KB', ext: 'docx' },
    { name: '연간_마케팅_계획서_2026.docx', cat: 'sales', date: '2026.01.10', user: '진양우 (대표)', size: '250 KB', ext: 'docx' },

    // ═══════════════════════════════════════════════════════════
    // 7. 안전 및 위생 (safety) — 20건
    // ═══════════════════════════════════════════════════════════
    { name: '안전보건_관리체계_구축계획서.pdf', cat: 'safety', date: '2026.04.01', user: '진양우 (대표)', size: '2.5 MB', ext: 'pdf' },
    { name: '위험성_평가표_양식.xlsx', cat: 'safety', date: '2026.03.28', user: '박철수 (공무팀)', size: '95 KB', ext: 'xlsx' },
    { name: '산업재해_발생_보고서.hwp', cat: 'safety', date: '2026.03.25', user: '김지원 (지원팀)', size: '140 KB', ext: 'hwp' },
    { name: '근골격계_유해요인_조사표.xlsx', cat: 'safety', date: '2026.03.20', user: '김지원 (지원팀)', size: '88 KB', ext: 'xlsx' },
    { name: '보건_위생교육_실시_기록부.xlsx', cat: 'safety', date: '2026.03.15', user: '김지원 (지원팀)', size: '72 KB', ext: 'xlsx' },
    { name: '소독_방역_일지.xlsx', cat: 'safety', date: '2026.03.10', user: '박철수 (공무팀)', size: '55 KB', ext: 'xlsx' },
    { name: '레지오넬라_검사_성적서.pdf', cat: 'safety', date: '2026.03.05', user: '박철수 (공무팀)', size: '1.2 MB', ext: 'pdf' },
    { name: '화학물질(약품)_관리대장.xlsx', cat: 'safety', date: '2026.02.28', user: '박철수 (공무팀)', size: '82 KB', ext: 'xlsx' },
    { name: 'MSDS_물질안전보건자료_목록.pdf', cat: 'safety', date: '2026.02.25', user: '박철수 (공무팀)', size: '3.2 MB', ext: 'pdf' },
    { name: '개인보호구_지급대장.xlsx', cat: 'safety', date: '2026.02.20', user: '박철수 (공무팀)', size: '48 KB', ext: 'xlsx' },
    { name: '비상_대피_계획서.pdf', cat: 'safety', date: '2026.02.15', user: '박철수 (공무팀)', size: '1.8 MB', ext: 'pdf' },
    { name: '응급처치_매뉴얼.pdf', cat: 'safety', date: '2026.02.10', user: '김지원 (지원팀)', size: '1.5 MB', ext: 'pdf' },
    { name: '안전_교육일지_양식.xlsx', cat: 'safety', date: '2026.02.05', user: '김지원 (지원팀)', size: '62 KB', ext: 'xlsx' },
    { name: '사고_발생_보고서_양식.hwp', cat: 'safety', date: '2026.01.28', user: '김지원 (지원팀)', size: '110 KB', ext: 'hwp' },
    { name: '식품위생_자체_점검표.xlsx', cat: 'safety', date: '2026.01.20', user: '박영수 (식음료팀)', size: '78 KB', ext: 'xlsx' },
    { name: '건강진단_결과_관리대장.xlsx', cat: 'safety', date: '2026.01.15', user: '김지원 (지원팀)', size: '85 KB', ext: 'xlsx' },
    { name: '위생복_착용_점검표.xlsx', cat: 'safety', date: '2025.12.20', user: '박영수 (식음료팀)', size: '42 KB', ext: 'xlsx' },
    { name: '작업환경_측정결과보고서.pdf', cat: 'safety', date: '2025.12.15', user: '박철수 (공무팀)', size: '1.1 MB', ext: 'pdf' },
    { name: '전기안전_관리자_선임대장.xlsx', cat: 'safety', date: '2025.11.25', user: '박철수 (공무팀)', size: '52 KB', ext: 'xlsx' },
    { name: '가스_안전점검_기록부.xlsx', cat: 'safety', date: '2025.11.20', user: '박철수 (공무팀)', size: '58 KB', ext: 'xlsx' },

    // ═══════════════════════════════════════════════════════════
    // 8. 총무/일반 양식 (general) — 25건
    // ═══════════════════════════════════════════════════════════
    { name: '기안서_일반_양식.hwp', cat: 'general', date: '2026.04.15', user: '김지원 (지원팀)', size: '120 KB', ext: 'hwp' },
    { name: '품의서_양식.hwp', cat: 'general', date: '2026.04.12', user: '김지원 (지원팀)', size: '115 KB', ext: 'hwp' },
    { name: '업무협조_요청서.hwp', cat: 'general', date: '2026.04.10', user: '김지원 (지원팀)', size: '105 KB', ext: 'hwp' },
    { name: '회의록_양식.docx', cat: 'general', date: '2026.04.08', user: '김지원 (지원팀)', size: '88 KB', ext: 'docx' },
    { name: '주간_업무보고서_양식.xlsx', cat: 'general', date: '2026.04.05', user: '김지원 (지원팀)', size: '72 KB', ext: 'xlsx' },
    { name: '월간_업무보고서_양식.xlsx', cat: 'general', date: '2026.04.01', user: '김지원 (지원팀)', size: '85 KB', ext: 'xlsx' },
    { name: '사업계획서_양식.docx', cat: 'general', date: '2026.03.28', user: '진양우 (대표)', size: '150 KB', ext: 'docx' },
    { name: '내부_공문_양식.hwp', cat: 'general', date: '2026.03.25', user: '김지원 (지원팀)', size: '95 KB', ext: 'hwp' },
    { name: '외부_공문_비지니스레터.hwp', cat: 'general', date: '2026.03.20', user: '김지원 (지원팀)', size: '98 KB', ext: 'hwp' },
    { name: '출장_보고서_양식.xlsx', cat: 'general', date: '2026.03.15', user: '김지원 (지원팀)', size: '68 KB', ext: 'xlsx' },
    { name: '출장_신청서_양식.hwp', cat: 'general', date: '2026.03.10', user: '김지원 (지원팀)', size: '110 KB', ext: 'hwp' },
    { name: '업무연락_양식.hwp', cat: 'general', date: '2026.03.05', user: '김지원 (지원팀)', size: '82 KB', ext: 'hwp' },
    { name: '서약서_양식_일반.hwp', cat: 'general', date: '2026.02.28', user: '김지원 (지원팀)', size: '78 KB', ext: 'hwp' },
    { name: '위임장_양식.hwp', cat: 'general', date: '2026.02.25', user: '김지원 (지원팀)', size: '72 KB', ext: 'hwp' },
    { name: '사유서_양식.hwp', cat: 'general', date: '2026.02.20', user: '김지원 (지원팀)', size: '68 KB', ext: 'hwp' },
    { name: '확인서_양식_일반.hwp', cat: 'general', date: '2026.02.15', user: '김지원 (지원팀)', size: '65 KB', ext: 'hwp' },
    { name: '명함_제작_신청서.xlsx', cat: 'general', date: '2026.02.10', user: '김지원 (지원팀)', size: '42 KB', ext: 'xlsx' },
    { name: '사무용품_신청서_양식.xlsx', cat: 'general', date: '2026.02.05', user: '김지원 (지원팀)', size: '48 KB', ext: 'xlsx' },
    { name: '차량_운행일지.xlsx', cat: 'general', date: '2026.01.28', user: '김지원 (지원팀)', size: '55 KB', ext: 'xlsx' },
    { name: '시설_사용_신청서.hwp', cat: 'general', date: '2026.01.25', user: '김지원 (지원팀)', size: '82 KB', ext: 'hwp' },
    { name: '경비_지출_보고서.xlsx', cat: 'general', date: '2026.01.20', user: '김지원 (지원팀)', size: '75 KB', ext: 'xlsx' },
    { name: '전화_수신_기록부.xlsx', cat: 'general', date: '2026.01.15', user: '김지원 (지원팀)', size: '38 KB', ext: 'xlsx' },
    { name: '방문객_등록대장.xlsx', cat: 'general', date: '2026.01.10', user: '김지원 (지원팀)', size: '42 KB', ext: 'xlsx' },
    { name: '우편물_수발_대장.xlsx', cat: 'general', date: '2025.12.20', user: '김지원 (지원팀)', size: '38 KB', ext: 'xlsx' },
    { name: '사업자등록증_사본.pdf', cat: 'general', date: '2025.03.10', user: '진양우 (대표)', size: '85 KB', ext: 'pdf' },

    // ═══════════════════════════════════════════════════════════
    // 9. IT/정보보안 (it) — 15건
    // ═══════════════════════════════════════════════════════════
    { name: '정보보안_관리_매뉴얼.pdf', cat: 'it', date: '2026.03.20', user: '진양우 (대표)', size: '1.8 MB', ext: 'pdf' },
    { name: 'PC_보안점검_체크리스트.xlsx', cat: 'it', date: '2026.03.15', user: '김지원 (지원팀)', size: '65 KB', ext: 'xlsx' },
    { name: '개인정보_파기_대장.xlsx', cat: 'it', date: '2026.03.10', user: '김지원 (지원팀)', size: '52 KB', ext: 'xlsx' },
    { name: '시스템_장애_보고서_양식.docx', cat: 'it', date: '2026.03.05', user: '김지원 (지원팀)', size: '88 KB', ext: 'docx' },
    { name: '신규_계정_발급_신청서.xlsx', cat: 'it', date: '2026.02.28', user: '김지원 (지원팀)', size: '48 KB', ext: 'xlsx' },
    { name: 'IT_장비_대장.xlsx', cat: 'it', date: '2026.02.25', user: '김지원 (지원팀)', size: '78 KB', ext: 'xlsx' },
    { name: '소프트웨어_라이선스_대장.xlsx', cat: 'it', date: '2026.02.20', user: '김지원 (지원팀)', size: '62 KB', ext: 'xlsx' },
    { name: '백업_관리대장.xlsx', cat: 'it', date: '2026.02.15', user: '김지원 (지원팀)', size: '45 KB', ext: 'xlsx' },
    { name: '네트워크_장비_관리대장.xlsx', cat: 'it', date: '2026.02.10', user: '김지원 (지원팀)', size: '55 KB', ext: 'xlsx' },
    { name: '와이파이_접속_관리표.xlsx', cat: 'it', date: '2026.02.05', user: '김지원 (지원팀)', size: '38 KB', ext: 'xlsx' },
    { name: 'ERP_사용자_가이드.pdf', cat: 'it', date: '2026.01.20', user: '진양우 (대표)', size: '2.5 MB', ext: 'pdf' },
    { name: '개인정보_영향평가서.docx', cat: 'it', date: '2026.01.15', user: '김지원 (지원팀)', size: '150 KB', ext: 'docx' },
    { name: '정보보안_서약서.hwp', cat: 'it', date: '2025.12.20', user: '김지원 (지원팀)', size: '85 KB', ext: 'hwp' },
    { name: '개인정보_처리_위탁계약서.docx', cat: 'it', date: '2025.12.15', user: '진양우 (대표)', size: '120 KB', ext: 'docx' },
    { name: '홈페이지_콘텐츠_관리대장.xlsx', cat: 'it', date: '2025.11.20', user: '김지원 (지원팀)', size: '68 KB', ext: 'xlsx' },

    // ═══════════════════════════════════════════════════════════
    // 10. 계약서/법무 (contract) — 20건
    // ═══════════════════════════════════════════════════════════
    { name: '일반_용역_계약서_양식.docx', cat: 'contract', date: '2026.04.05', user: '진양우 (대표)', size: '145 KB', ext: 'docx' },
    { name: '물품_구매_계약서_양식.docx', cat: 'contract', date: '2026.04.01', user: '진양우 (대표)', size: '135 KB', ext: 'docx' },
    { name: '건물_임대차_계약서.docx', cat: 'contract', date: '2026.03.28', user: '진양우 (대표)', size: '180 KB', ext: 'docx' },
    { name: '비밀유지계약서(NDA)_양식.docx', cat: 'contract', date: '2026.03.25', user: '진양우 (대표)', size: '120 KB', ext: 'docx' },
    { name: '위탁운영_계약서_양식.docx', cat: 'contract', date: '2026.03.20', user: '진양우 (대표)', size: '165 KB', ext: 'docx' },
    { name: '공사_도급_계약서_양식.docx', cat: 'contract', date: '2026.03.15', user: '진양우 (대표)', size: '195 KB', ext: 'docx' },
    { name: '광고_대행_계약서.docx', cat: 'contract', date: '2026.03.10', user: '진양우 (대표)', size: '140 KB', ext: 'docx' },
    { name: '식자재_납품_계약서.docx', cat: 'contract', date: '2026.03.05', user: '진양우 (대표)', size: '130 KB', ext: 'docx' },
    { name: '청소_용역_계약서.docx', cat: 'contract', date: '2026.02.28', user: '진양우 (대표)', size: '125 KB', ext: 'docx' },
    { name: '경비_용역_계약서.docx', cat: 'contract', date: '2026.02.25', user: '진양우 (대표)', size: '135 KB', ext: 'docx' },
    { name: '세탁_위탁_계약서.docx', cat: 'contract', date: '2026.02.20', user: '진양우 (대표)', size: '110 KB', ext: 'docx' },
    { name: '폐기물처리_위탁_계약서.docx', cat: 'contract', date: '2026.02.15', user: '진양우 (대표)', size: '120 KB', ext: 'docx' },
    { name: '소프트웨어_개발_계약서.docx', cat: 'contract', date: '2026.02.10', user: '진양우 (대표)', size: '150 KB', ext: 'docx' },
    { name: '인테리어_공사_계약서.docx', cat: 'contract', date: '2026.02.05', user: '진양우 (대표)', size: '175 KB', ext: 'docx' },
    { name: '보험_가입증서_종합.pdf', cat: 'contract', date: '2026.01.28', user: '김지원 (지원팀)', size: '2.2 MB', ext: 'pdf' },
    { name: '화재보험_증권_사본.pdf', cat: 'contract', date: '2026.01.25', user: '김지원 (지원팀)', size: '1.5 MB', ext: 'pdf' },
    { name: '배상책임보험_증권.pdf', cat: 'contract', date: '2026.01.20', user: '김지원 (지원팀)', size: '1.3 MB', ext: 'pdf' },
    { name: '법률자문_의뢰서_양식.docx', cat: 'contract', date: '2025.12.20', user: '진양우 (대표)', size: '95 KB', ext: 'docx' },
    { name: '내용증명_발송_양식.hwp', cat: 'contract', date: '2025.12.15', user: '김지원 (지원팀)', size: '85 KB', ext: 'hwp' },
    { name: '지식재산권_양도_계약서.docx', cat: 'contract', date: '2025.11.20', user: '진양우 (대표)', size: '130 KB', ext: 'docx' },
];
