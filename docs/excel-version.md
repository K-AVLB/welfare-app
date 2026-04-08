# Excel Version

`exports/student-welfare-excel-tool.xlsx` is a compatibility-first Excel operating version of the service.

## Sheets

- `사용안내`: operating notes and limitations
- `입력`: age, gender, school level, note, manual tags, manual keywords
- `기관목록`: organization master data
- `사업DB`: program master data
- `추천필터`: filter and scoring table

## How To Use

1. Enter the student situation in `입력`.
2. Enter up to 5 tags and up to 3 keywords manually.
3. Review `추천필터`.
4. Sort by `총점` in descending order.

## Notes

- The workbook avoids dynamic array formulas for better compatibility.
- Free-text recommendation is reduced compared with the web app.
- Use it as an operational fallback, not as a feature-complete replacement.

## Generate

Run:

```bash
cd scripts
npm run excel-tool
```
