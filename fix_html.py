import sys

with open('hr.html', 'r', encoding='utf-8') as f:
    orig = f.read()

target = '''                            <tbody>
                                <tr>
                                    <td>105</td>
                                    <td>홍길동</td>
                                    <td class="text-right">3,000,000</td>
                                    <td class="text-right">200,000</td>
                                    <td class="text-right">450,000</td>
                                    <td class="text-right">-135,000</td>
                                    <td class="text-right">-106,350</td>
                                    <td class="text-right">-27,000</td>
                                    <td class="text-right">-85,000</td>
                                    <td class="highlight text-right">3,296,650</td>
                                </tr>
                                <tr>
                                    <td>021</td>
                                    <td>김지원</td>
                                    <td class="text-right">4,200,000</td>
                                    <td class="text-right">200,000</td>
                                    <td class="text-right">0</td>
                                    <td class="text-right">-189,000</td>
                                    <td class="text-right">-148,890</td>
                                    <td class="text-right">-37,800</td>
                                    <td class="text-right">-152,000</td>
                                    <td class="highlight text-right">3,872,310</td>
                                </tr>
                                <tr>
                                    <td>203</td>
                                    <td>박철수</td>
                                    <td class="text-right">3,500,000</td>
                                    <td class="text-right">200,000</td>
                                    <td class="text-right">250,000</td>
                                    <td class="text-right">-157,500</td>
                                    <td class="text-right">-124,070</td>
                                    <td class="text-right">-31,500</td>
                                    <td class="text-right">-115,000</td>
                                    <td class="highlight text-right">3,521,930</td>
                                </tr>
                            </tbody>'''

replacement = '''                            <tbody id="payrollTableBody">
                                <tr>
                                    <td>105</td>
                                    <td>크루(팀원)</td>
                                    <td>홍길동</td>
                                    <td class="text-right">3,000,000</td>
                                    <td class="text-right">200,000</td>
                                    <td class="text-right">450,000</td>
                                    <td class="text-right">-135,000</td>
                                    <td class="text-right">-106,350</td>
                                    <td class="text-right">-27,000</td>
                                    <td class="text-right">-85,000</td>
                                    <td class="highlight text-right">3,296,650</td>
                                </tr>
                                <tr>
                                    <td>021</td>
                                    <td>큐레이터(팀장)</td>
                                    <td>김지원</td>
                                    <td class="text-right">4,200,000</td>
                                    <td class="text-right">200,000</td>
                                    <td class="text-right">0</td>
                                    <td class="text-right">-189,000</td>
                                    <td class="text-right">-148,890</td>
                                    <td class="text-right">-37,800</td>
                                    <td class="text-right">-152,000</td>
                                    <td class="highlight text-right">3,872,310</td>
                                </tr>
                                <tr>
                                    <td>203</td>
                                    <td>주임</td>
                                    <td>박철수</td>
                                    <td class="text-right">3,500,000</td>
                                    <td class="text-right">200,000</td>
                                    <td class="text-right">250,000</td>
                                    <td class="text-right">-157,500</td>
                                    <td class="text-right">-124,070</td>
                                    <td class="text-right">-31,500</td>
                                    <td class="text-right">-115,000</td>
                                    <td class="highlight text-right">3,521,930</td>
                                </tr>
                            </tbody>'''

target_crlf = target.replace('\n', '\r\n')
if target in orig:
    result = orig.replace(target, replacement)
    print("Replaced LF target")
elif target_crlf in orig:
    result = orig.replace(target_crlf, replacement)
    print("Replaced CRLF target")
else:
    print("Target not found!")
    sys.exit(1)

with open('hr.html', 'w', encoding='utf-8', newline='\n') as f:
    f.write(result)
