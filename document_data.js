/**
 * document_data.js  ─  홍삼한방타운 ERP 문서관리 모듈 양식 데이터
 * 40인 규모 스파/리조트 사업장에서 실제 필요한 핵심 문서 양식
 *
 * 카테고리 구조:
 *   all           = 전체 문서
 *   favorites     = 즐겨찾기 (★)
 *   policy        = 사규 및 규정
 *   accounting    = 경영 및 회계
 *   hr            = 인사 (HR) 양식
 *   facility      = 시설 및 공무 자료
 *   operation     = 매장 운영 매뉴얼
 *   sales         = 영업 및 마케팅
 *   safety        = 안전 및 위생
 *   general       = 총무/일반 양식
 *   contract      = 계약서/법무
 *
 * 보안등급(secLevel):
 *   public    = 전사공개
 *   dept      = 부서공개
 *   conf      = 대외비
 */

const DOC_CATEGORIES = [
    { id: 'all',        label: '전체 문서',          icon: 'fa-folder-open',  restricted: false },
    { id: 'favorites',  label: '★ 즐겨찾기',        icon: 'fa-star',         restricted: false },
    { id: 'policy',     label: '사규 및 규정',       icon: 'fa-lock',         restricted: true  },
    { id: 'accounting', label: '경영 및 회계',       icon: 'fa-lock',         restricted: true  },
    { id: 'hr',         label: '인사 (HR) 양식',     icon: 'fa-folder',       restricted: false },
    { id: 'facility',   label: '시설 및 공무 자료',  icon: 'fa-folder',       restricted: false },
    { id: 'operation',  label: '매장 운영 매뉴얼',   icon: 'fa-folder',       restricted: false },
    { id: 'sales',      label: '영업 및 마케팅',     icon: 'fa-folder',       restricted: false },
    { id: 'safety',     label: '안전 및 위생',       icon: 'fa-folder',       restricted: false },
    { id: 'general',    label: '총무/일반 양식',     icon: 'fa-folder',       restricted: false },
    { id: 'contract',   label: '계약서/법무',        icon: 'fa-folder',       restricted: false },
];

// ── 양식 데이터 ──────────────────────────────────────
const DOC_TEMPLATES = [
    // ── 사규 및 규정 (policy) ──
    { name: '취업규칙_홍삼한방타운_최종.docx',               cat: 'policy',     ext: 'docx', date: '2026-01-15', user: '진양우 대표', size: '285 KB', secLevel: 'conf' },
    { name: '인사규정_2026년_개정본.docx',                   cat: 'policy',     ext: 'docx', date: '2026-01-15', user: '진양우 대표', size: '198 KB', secLevel: 'conf' },
    { name: '급여규정_홍삼한방타운.docx',                    cat: 'policy',     ext: 'docx', date: '2026-01-15', user: '진양우 대표', size: '176 KB', secLevel: 'conf' },
    { name: '복무규정_근무형태및시간.docx',                  cat: 'policy',     ext: 'docx', date: '2026-02-01', user: '진양우 대표', size: '142 KB', secLevel: 'conf' },
    { name: '보안관리규정_정보보호.docx',                    cat: 'policy',     ext: 'docx', date: '2026-02-10', user: '진양우 대표', size: '165 KB', secLevel: 'conf' },
    { name: '개인정보처리방침_2026.pdf',                     cat: 'policy',     ext: 'pdf',  date: '2026-01-20', user: '진양우 대표', size: '320 KB', secLevel: 'public' },
    { name: '윤리강령_및_행동수칙.pdf',                      cat: 'policy',     ext: 'pdf',  date: '2025-12-20', user: '진양우 대표', size: '210 KB', secLevel: 'public' },
    { name: '성희롱예방지침.pdf',                            cat: 'policy',     ext: 'pdf',  date: '2025-06-01', user: '진양우 대표', size: '180 KB', secLevel: 'public' },
    { name: '직장내괴롭힘예방및대응지침.pdf',                cat: 'policy',     ext: 'pdf',  date: '2025-06-01', user: '진양우 대표', size: '195 KB', secLevel: 'public' },
    { name: '차량운행관리규정.docx',                         cat: 'policy',     ext: 'docx', date: '2026-03-01', user: '진양우 대표', size: '88 KB',  secLevel: 'dept' },

    // ── 경영 및 회계 (accounting) ──
    { name: '2026년_사업계획서.pdf',                         cat: 'accounting', ext: 'pdf',  date: '2026-01-10', user: '진양우 대표', size: '1.8 MB', secLevel: 'conf' },
    { name: '월간_손익계산서_양식.xlsx',                     cat: 'accounting', ext: 'xlsx', date: '2026-01-05', user: '진양우 대표', size: '85 KB',  secLevel: 'conf' },
    { name: '자금일보_양식.xlsx',                            cat: 'accounting', ext: 'xlsx', date: '2026-01-05', user: '진양우 대표', size: '62 KB',  secLevel: 'conf' },
    { name: '법인카드사용내역_정산양식.xlsx',                cat: 'accounting', ext: 'xlsx', date: '2026-02-01', user: '김지현 경리', size: '78 KB',  secLevel: 'conf' },
    { name: '세금계산서_발행대장.xlsx',                      cat: 'accounting', ext: 'xlsx', date: '2026-01-10', user: '김지현 경리', size: '92 KB',  secLevel: 'conf' },
    { name: '고정자산대장_관리양식.xlsx',                    cat: 'accounting', ext: 'xlsx', date: '2026-03-15', user: '김지현 경리', size: '105 KB', secLevel: 'conf' },
    { name: '부가가치세_신고자료_정리표.xlsx',               cat: 'accounting', ext: 'xlsx', date: '2026-04-20', user: '김지현 경리', size: '115 KB', secLevel: 'conf' },
    { name: '월별_매출집계표_양식.xlsx',                     cat: 'accounting', ext: 'xlsx', date: '2026-01-05', user: '진양우 대표', size: '72 KB',  secLevel: 'dept' },

    // ── 인사 (HR) 양식 (hr) ──
    { name: '연차휴가사용신청서.docx',                       cat: 'hr',         ext: 'docx', date: '2026-01-10', user: '김미영 팀장', size: '45 KB',  secLevel: 'public' },
    { name: '경조사비신청서.docx',                           cat: 'hr',         ext: 'docx', date: '2026-01-10', user: '김미영 팀장', size: '38 KB',  secLevel: 'public' },
    { name: '시간외근무신청서.docx',                         cat: 'hr',         ext: 'docx', date: '2026-01-10', user: '김미영 팀장', size: '42 KB',  secLevel: 'public' },
    { name: '출장신청및결과보고서.docx',                     cat: 'hr',         ext: 'docx', date: '2026-01-10', user: '김미영 팀장', size: '52 KB',  secLevel: 'public' },
    { name: '교육훈련신청서.docx',                           cat: 'hr',         ext: 'docx', date: '2026-02-15', user: '김미영 팀장', size: '40 KB',  secLevel: 'public' },
    { name: '근로계약서_표준양식.docx',                      cat: 'hr',         ext: 'docx', date: '2026-01-05', user: '김미영 팀장', size: '68 KB',  secLevel: 'dept' },
    { name: '수습직원평가서.docx',                           cat: 'hr',         ext: 'docx', date: '2026-01-05', user: '김미영 팀장', size: '55 KB',  secLevel: 'dept' },
    { name: '퇴직금정산_요청서.docx',                        cat: 'hr',         ext: 'docx', date: '2026-01-15', user: '김미영 팀장', size: '48 KB',  secLevel: 'dept' },
    { name: '인수인계서_양식.docx',                          cat: 'hr',         ext: 'docx', date: '2026-03-01', user: '김미영 팀장', size: '56 KB',  secLevel: 'public' },
    { name: '신입직원OJT체크리스트.xlsx',                    cat: 'hr',         ext: 'xlsx', date: '2026-02-01', user: '김미영 팀장', size: '62 KB',  secLevel: 'public' },
    { name: '인사발령통보서.docx',                           cat: 'hr',         ext: 'docx', date: '2026-01-10', user: '김미영 팀장', size: '35 KB',  secLevel: 'dept' },
    { name: '자기평가서(연간).docx',                         cat: 'hr',         ext: 'docx', date: '2026-01-10', user: '김미영 팀장', size: '44 KB',  secLevel: 'public' },

    // ── 시설 및 공무 자료 (facility) ──
    { name: '시설물_점검일지_양식.xlsx',                     cat: 'facility',   ext: 'xlsx', date: '2026-01-20', user: '박종수 팀장', size: '76 KB',  secLevel: 'public' },
    { name: '소방안전관리_점검표.pdf',                       cat: 'facility',   ext: 'pdf',  date: '2026-01-15', user: '박종수 팀장', size: '420 KB', secLevel: 'public' },
    { name: '엘리베이터_정기점검_기록부.xlsx',               cat: 'facility',   ext: 'xlsx', date: '2026-02-10', user: '박종수 팀장', size: '58 KB',  secLevel: 'public' },
    { name: '보일러_가동_일지.xlsx',                         cat: 'facility',   ext: 'xlsx', date: '2026-03-01', user: '박종수 팀장', size: '52 KB',  secLevel: 'public' },
    { name: '수질검사_결과보고서.pdf',                       cat: 'facility',   ext: 'pdf',  date: '2026-04-10', user: '박종수 팀장', size: '1.2 MB', secLevel: 'public' },
    { name: '온천수_수질관리대장.xlsx',                      cat: 'facility',   ext: 'xlsx', date: '2026-03-15', user: '박종수 팀장', size: '68 KB',  secLevel: 'dept' },
    { name: '객실_비품_재고현황.xlsx',                       cat: 'facility',   ext: 'xlsx', date: '2026-04-01', user: '박종수 팀장', size: '94 KB',  secLevel: 'public' },
    { name: '수선유지비_지출품의서.docx',                    cat: 'facility',   ext: 'docx', date: '2026-02-20', user: '박종수 팀장', size: '42 KB',  secLevel: 'public' },
    { name: '객실_수리_요청서.docx',                         cat: 'facility',   ext: 'docx', date: '2026-01-10', user: '박종수 팀장', size: '38 KB',  secLevel: 'public' },
    { name: '에너지사용량_월보.xlsx',                        cat: 'facility',   ext: 'xlsx', date: '2026-05-01', user: '박종수 팀장', size: '55 KB',  secLevel: 'dept' },

    // ── 매장 운영 매뉴얼 (operation) ──
    { name: '프론트데스크_운영매뉴얼.pdf',                   cat: 'operation',  ext: 'pdf',  date: '2026-01-05', user: '이수진 매니저', size: '2.1 MB', secLevel: 'public' },
    { name: '객실_체크인_체크아웃_절차서.pdf',               cat: 'operation',  ext: 'pdf',  date: '2026-01-05', user: '이수진 매니저', size: '850 KB', secLevel: 'public' },
    { name: '스파_운영_표준절차서.pdf',                      cat: 'operation',  ext: 'pdf',  date: '2026-02-01', user: '이수진 매니저', size: '1.5 MB', secLevel: 'public' },
    { name: '조식뷔페_운영매뉴얼.pdf',                      cat: 'operation',  ext: 'pdf',  date: '2026-02-15', user: '이수진 매니저', size: '1.2 MB', secLevel: 'public' },
    { name: '고객_불만_처리_절차서.pdf',                     cat: 'operation',  ext: 'pdf',  date: '2026-01-20', user: '이수진 매니저', size: '680 KB', secLevel: 'public' },
    { name: '야간_근무자_업무_체크리스트.docx',              cat: 'operation',  ext: 'docx', date: '2026-03-01', user: '이수진 매니저', size: '48 KB',  secLevel: 'public' },
    { name: 'VIP고객_응대_가이드.pdf',                       cat: 'operation',  ext: 'pdf',  date: '2026-01-10', user: '이수진 매니저', size: '520 KB', secLevel: 'dept' },
    { name: '비상시_고객대피_안내문.pdf',                    cat: 'operation',  ext: 'pdf',  date: '2025-12-01', user: '이수진 매니저', size: '380 KB', secLevel: 'public' },
    { name: '일일_객실_청소_점검표.xlsx',                    cat: 'operation',  ext: 'xlsx', date: '2026-04-01', user: '이수진 매니저', size: '45 KB',  secLevel: 'public' },
    { name: '분실물_접수_대장.xlsx',                         cat: 'operation',  ext: 'xlsx', date: '2026-01-10', user: '이수진 매니저', size: '38 KB',  secLevel: 'public' },

    // ── 영업 및 마케팅 (sales) ──
    { name: '객실_요금표_2026년.xlsx',                       cat: 'sales',      ext: 'xlsx', date: '2026-01-01', user: '진양우 대표', size: '72 KB',  secLevel: 'dept' },
    { name: '여행사_수수료_계약_정리표.xlsx',                cat: 'sales',      ext: 'xlsx', date: '2026-02-10', user: '진양우 대표', size: '88 KB',  secLevel: 'conf' },
    { name: 'OTA_채널_관리_가이드.pdf',                      cat: 'sales',      ext: 'pdf',  date: '2026-03-01', user: '진양우 대표', size: '650 KB', secLevel: 'dept' },
    { name: '프로모션_기획안_양식.docx',                     cat: 'sales',      ext: 'docx', date: '2026-01-15', user: '진양우 대표', size: '56 KB',  secLevel: 'public' },
    { name: '단체_견적서_양식.xlsx',                         cat: 'sales',      ext: 'xlsx', date: '2026-01-20', user: '진양우 대표', size: '65 KB',  secLevel: 'public' },
    { name: '연회_행사_제안서_템플릿.pptx',                  cat: 'sales',      ext: 'pptx', date: '2026-02-20', user: '진양우 대표', size: '3.5 MB', secLevel: 'public' },
    { name: '월별_마케팅_성과보고서_양식.docx',              cat: 'sales',      ext: 'docx', date: '2026-03-10', user: '진양우 대표', size: '52 KB',  secLevel: 'dept' },
    { name: '고객_설문조사지_양식.docx',                     cat: 'sales',      ext: 'docx', date: '2026-04-01', user: '이수진 매니저', size: '42 KB', secLevel: 'public' },

    // ── 안전 및 위생 (safety) ──
    { name: '위생관리_표준매뉴얼.pdf',                       cat: 'safety',     ext: 'pdf',  date: '2026-01-10', user: '박종수 팀장', size: '1.8 MB', secLevel: 'public' },
    { name: '식품위생_자가점검표.xlsx',                      cat: 'safety',     ext: 'xlsx', date: '2026-02-01', user: '박종수 팀장', size: '68 KB',  secLevel: 'public' },
    { name: '소방훈련_실시결과보고서_양식.docx',             cat: 'safety',     ext: 'docx', date: '2026-03-15', user: '박종수 팀장', size: '55 KB',  secLevel: 'public' },
    { name: '화학물질_MSDS_관리대장.xlsx',                   cat: 'safety',     ext: 'xlsx', date: '2026-01-20', user: '박종수 팀장', size: '82 KB',  secLevel: 'dept' },
    { name: '산업안전보건_교육일지.docx',                    cat: 'safety',     ext: 'docx', date: '2026-04-01', user: '김미영 팀장', size: '45 KB',  secLevel: 'public' },
    { name: '감염병_대응_행동지침.pdf',                      cat: 'safety',     ext: 'pdf',  date: '2025-09-01', user: '박종수 팀장', size: '520 KB', secLevel: 'public' },
    { name: '레지오넬라균_관리대장.xlsx',                    cat: 'safety',     ext: 'xlsx', date: '2026-05-01', user: '박종수 팀장', size: '48 KB',  secLevel: 'dept' },
    { name: '해충방제_관리일지.xlsx',                        cat: 'safety',     ext: 'xlsx', date: '2026-03-01', user: '박종수 팀장', size: '42 KB',  secLevel: 'public' },

    // ── 총무/일반 양식 (general) ──
    { name: '지출결의서_양식.docx',                          cat: 'general',    ext: 'docx', date: '2026-01-05', user: '김미영 팀장', size: '42 KB',  secLevel: 'public' },
    { name: '기안서_양식.docx',                              cat: 'general',    ext: 'docx', date: '2026-01-05', user: '김미영 팀장', size: '38 KB',  secLevel: 'public' },
    { name: '업무연락서_양식.docx',                          cat: 'general',    ext: 'docx', date: '2026-01-05', user: '김미영 팀장', size: '35 KB',  secLevel: 'public' },
    { name: '회의록_양식.docx',                              cat: 'general',    ext: 'docx', date: '2026-01-10', user: '김미영 팀장', size: '40 KB',  secLevel: 'public' },
    { name: '비품구매요청서.docx',                           cat: 'general',    ext: 'docx', date: '2026-01-10', user: '김미영 팀장', size: '36 KB',  secLevel: 'public' },
    { name: '사내_공지문_양식.docx',                         cat: 'general',    ext: 'docx', date: '2026-02-01', user: '김미영 팀장', size: '32 KB',  secLevel: 'public' },
    { name: '차량_운행_일지.xlsx',                           cat: 'general',    ext: 'xlsx', date: '2026-01-15', user: '김미영 팀장', size: '48 KB',  secLevel: 'public' },
    { name: '택배_발송_접수대장.xlsx',                       cat: 'general',    ext: 'xlsx', date: '2026-03-10', user: '김미영 팀장', size: '38 KB',  secLevel: 'public' },
    { name: '명함_제작_요청서.docx',                         cat: 'general',    ext: 'docx', date: '2026-04-01', user: '김미영 팀장', size: '28 KB',  secLevel: 'public' },

    // ── IT/정보보안 (it) ──
    { name: 'ERP_사용자_매뉴얼.pdf',                         cat: 'it',         ext: 'pdf',  date: '2026-01-15', user: '진양우 대표', size: '2.8 MB', secLevel: 'public' },
    { name: 'PC_보안_점검_체크리스트.xlsx',                  cat: 'it',         ext: 'xlsx', date: '2026-02-01', user: '진양우 대표', size: '52 KB',  secLevel: 'public' },
    { name: '비밀번호_관리_가이드라인.pdf',                  cat: 'it',         ext: 'pdf',  date: '2026-01-10', user: '진양우 대표', size: '320 KB', secLevel: 'public' },
    { name: 'Wi-Fi_및_네트워크_설정안내.pdf',                cat: 'it',         ext: 'pdf',  date: '2026-03-01', user: '진양우 대표', size: '280 KB', secLevel: 'dept' },
    { name: 'CCTV_운영_관리지침.pdf',                        cat: 'it',         ext: 'pdf',  date: '2026-01-20', user: '진양우 대표', size: '450 KB', secLevel: 'conf' },
    { name: 'IT_장비_대장_관리표.xlsx',                      cat: 'it',         ext: 'xlsx', date: '2026-04-10', user: '진양우 대표', size: '65 KB',  secLevel: 'dept' },

    // ── 계약서/법무 (contract) ──
    { name: '표준_근로계약서(정규직).docx',                  cat: 'contract',   ext: 'docx', date: '2026-01-05', user: '진양우 대표', size: '72 KB',  secLevel: 'conf' },
    { name: '표준_근로계약서(계약직).docx',                  cat: 'contract',   ext: 'docx', date: '2026-01-05', user: '진양우 대표', size: '68 KB',  secLevel: 'conf' },
    { name: '아르바이트_근로계약서.docx',                    cat: 'contract',   ext: 'docx', date: '2026-01-05', user: '진양우 대표', size: '55 KB',  secLevel: 'conf' },
    { name: '비밀유지(NDA)_서약서.docx',                     cat: 'contract',   ext: 'docx', date: '2026-01-10', user: '진양우 대표', size: '48 KB',  secLevel: 'conf' },
    { name: '시설_임대차계약서_양식.docx',                   cat: 'contract',   ext: 'docx', date: '2026-02-01', user: '진양우 대표', size: '82 KB',  secLevel: 'conf' },
    { name: '외주업체_용역계약서_양식.docx',                 cat: 'contract',   ext: 'docx', date: '2026-02-15', user: '진양우 대표', size: '78 KB',  secLevel: 'conf' },
    { name: '물품_구매계약서_양식.docx',                     cat: 'contract',   ext: 'docx', date: '2026-03-01', user: '진양우 대표', size: '62 KB',  secLevel: 'conf' },
    { name: '개인정보_수집이용동의서.docx',                  cat: 'contract',   ext: 'docx', date: '2026-01-15', user: '진양우 대표', size: '42 KB',  secLevel: 'public' },
];
