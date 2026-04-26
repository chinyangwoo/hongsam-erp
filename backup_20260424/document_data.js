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
const DOC_TEMPLATES = [];
