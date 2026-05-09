import re

with open('hr.html', 'r', encoding='utf-8') as f:
    text = f.read()

pattern = re.compile(r'<tbody>\s*<tr>\s*<td>105</td>.*?</tbody>', re.DOTALL)

replacement = """<tbody id="payrollTableBody">
                                <tr>
                                    <td colspan="11" style="text-align: center; padding: 30px;">
                                        더존 양식의 엑셀 급여대장을 불러오면 급여 정보가 표기됩니다.
                                    </td>
                                </tr>
                            </tbody>"""

new_text = pattern.sub(replacement, text)

with open('hr.html', 'w', encoding='utf-8', newline='\n') as f:
    f.write(new_text)

print("Done")
