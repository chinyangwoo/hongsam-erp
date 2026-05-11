import xlrd
import requests
import json
import os

API_URL = "http://43.203.237.63:3001/api/db"
DB_KEY = "hongsam_employees"

def parse_douzone_excel(filepath):
    print(f"Parsing {filepath}...")
    wb = xlrd.open_workbook(filepath)
    sheet = wb.sheet_by_index(0)
    
    employees_payroll = {}
    
    # Search for the start of data (where first column looks like an employee ID or number)
    # The structure is 6 rows per employee
    
    row_idx = 0
    while row_idx < sheet.nrows:
        row = sheet.row_values(row_idx)
        # Check if row looks like the start of an employee block
        if len(row) > 0 and str(row[0]).strip().isdigit() and len(str(row[0]).strip()) > 4:
            if row_idx + 5 < sheet.nrows:
                emp_id = str(row[0]).strip()
                # Row 1: emp_id, base, ot, night_ot, housing, np, np_adj, hi, hi_adj
                base_salary = row[3] if isinstance(row[3], (int, float)) else 0
                ot_1 = row[4] if isinstance(row[4], (int, float)) else 0
                ot_2 = row[5] if isinstance(row[5], (int, float)) else 0
                np = row[7] if isinstance(row[7], (int, float)) else 0
                hi = row[9] if isinstance(row[9], (int, float)) else 0
                
                # Row 2: name, cert, get_cert, meal, '', ei, ei_adj, lt_care, lt_care_adj
                row2 = sheet.row_values(row_idx + 1)
                name = str(row2[0]).strip()
                meal = row2[5] if isinstance(row2[5], (int, float)) else 0
                ei = row2[7] if isinstance(row2[7], (int, float)) else 0
                
                # Row 3: dept, '', '', '', '', '', '', tax, local_tax, ...
                row3 = sheet.row_values(row_idx + 2)
                tax1 = row3[7] if isinstance(row3[7], (int, float)) else 0
                tax2 = row3[8] if isinstance(row3[8], (int, float)) else 0
                
                # Row 6: total 지급, 차인지급액
                row6 = sheet.row_values(row_idx + 5)
                net = row6[10] if isinstance(row6[10], (int, float)) else 0
                
                employees_payroll[emp_id] = {
                    "name_extracted": name,
                    "base_salary": str(int(base_salary)),
                    "ot_allowance": str(int(ot_1 + ot_2)),
                    "meal_allowance": str(int(meal)),
                    "national_pension": str(int(np)),
                    "health_insurance": str(int(hi)),
                    "employment_ins": str(int(ei)),
                    "income_tax": str(int(tax1 + tax2)),
                    "net_salary": str(int(net))
                }
            row_idx += 6
        else:
            row_idx += 1
            
    print(f"Parsed {len(employees_payroll)} employees from {filepath}")
    return employees_payroll

def main():
    # 1. Fetch current DB
    print("Fetching current DB from", API_URL)
    try:
        resp = requests.get(API_URL)
        resp.raise_for_status()
        data = resp.json()
        hongsam_employees = data.get(DB_KEY, [])
        if not isinstance(hongsam_employees, list):
            hongsam_employees = []
    except Exception as e:
        print("Failed to fetch DB:", e)
        return
        
    print(f"Current DB has {len(hongsam_employees)} employees.")
    
    # 2. Parse all 4 files in order
    files = ["급여대장_1월.xls", "급여대장_2월.xls", "급여대장_3월.xls", "급여대장_4월.xls"]
    
    # Create a mapping of name to employee index for fast lookup
    emp_map = {str(emp.get("name")).strip(): i for i, emp in enumerate(hongsam_employees)}
    
    total_updated = 0
    
    for f in files:
        if not os.path.exists(f):
            print(f"File not found: {f}")
            continue
        payroll_data = parse_douzone_excel(f)
        
        for emp_id, pdata in payroll_data.items():
            name = pdata.pop("name_extracted", None)
            if name and name in emp_map:
                idx = emp_map[name]
                hongsam_employees[idx].update(pdata)
                total_updated += 1
            else:
                pass

    print(f"Total payroll records updated: {total_updated} across all files.")
    
    # 3. Post back to DB
    update_url = f"{API_URL}/{DB_KEY}"
    print(f"Posting updated data to {update_url}")
    try:
        post_resp = requests.post(update_url, json=hongsam_employees)
        post_resp.raise_for_status()
        print("Successfully updated remote DB!")
    except Exception as e:
        print("Failed to post DB:", e)

if __name__ == '__main__':
    main()
