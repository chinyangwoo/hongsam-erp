const employees = [];
for (let i = 1; i <= 50; i++) {
    employees.push({ emp_id: String(i).padStart(3, '0') });
}
const currentEmpId = "021";
const filtered = employees.filter(e => e.emp_id === currentEmpId);
console.log(filtered);
