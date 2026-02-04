# Address Normalization Guidelines for Arabic Addresses

## Overview

This document provides guidelines for parsing and normalizing Arabic addresses in Saudi Arabia for the Najah Delivery OS Geocoding Service.

## Address Components

Saudi Arabian addresses typically consist of:

1. **Street Name** (اسم الشارع)
   - Often prefixed with `شارع` (street) or `طريق` (road)
   - Examples: `شارع الملك فهد`, `طريق الملك عبدالله`

2. **District/Neighborhood** (الحي)
   - Prefixed with `حي` or `منطقة`
   - Examples: `حي العليا`, `حي الملز`, `حي النخيل`

3. **City** (المدينة)
   - Major cities: الرياض, جدة, الدمام, مكة المكرمة, المدينة المنورة
   - Should be normalized to English equivalents

4. **Postal Code** (الرمز البريدي)
   - 5-digit format
   - Example: `12345`, `21589`

5. **Country** (البلد)
   - Always `Saudi Arabia` for KSA addresses

## Parsing Rules

### 1. Text Cleaning
- Remove extra whitespace
- Normalize Arabic characters
- Handle both Arabic (،) and English (,) commas
- Trim punctuation from extracted components

### 2. City Detection
Priority order:
1. Check for Arabic city names in KSA_CITIES dictionary
2. Check for English city names (case-insensitive)
3. Return `None` if no city found

Supported cities:
```python
{
    'الرياض': 'Riyadh',
    'جدة': 'Jeddah',
    'الدمام': 'Dammam',
    'مكة': 'Mecca',
    'مكة المكرمة': 'Mecca',
    'المدينة': 'Medina',
    'المدينة المنورة': 'Medina'
}
```

### 3. Street Extraction
Arabic patterns:
- Look for keywords: `شارع`, `طريق`, `ش`
- Pattern: `{keyword} {name}` followed by comma/space/digit
- Extract the name portion after the keyword

English patterns:
- Look for: `Street`, `St.`, `Road`, `Rd.`
- Support both prefix and suffix formats
- Pattern: `{name} Street` or `Street {name}`

### 4. District Extraction
Arabic patterns:
- Look for keywords: `حي`, `منطقة`, `حى`
- Pattern: `{keyword} {name}` followed by comma/space/digit
- Extract the name portion after the keyword

English patterns:
- Look for: `District`, `Neighborhood`, `Area`
- Pattern: `{keyword} {name}`

### 5. Postal Code Extraction
- Match 5 consecutive digits: `\b(\d{5})\b`
- First match is used
- No validation of actual postal code ranges

## Common Patterns

### Pattern 1: Full Address
```
شارع الملك فهد، حي العليا، الرياض 12345
```
Components:
- Street: `الملك فهد`
- District: `العليا`
- City: `Riyadh`
- Postal: `12345`

### Pattern 2: Street and City
```
طريق الملك عبدالله، جدة
```
Components:
- Street: `الملك عبدالله`
- District: `null`
- City: `Jeddah`

### Pattern 3: District and City
```
حي الملز، الرياض
```
Components:
- Street: `null`
- District: `الملز`
- City: `Riyadh`

### Pattern 4: City Only
```
الدمام
```
Components:
- Street: `null`
- District: `null`
- City: `Dammam`

## Bilingual Handling

When both Arabic and English are provided:
```json
{
  "ar": "شارع التحلية، حي الروضة، جدة",
  "en": "Tahlia Street, Al Rawdah District, Jeddah"
}
```

Strategy:
1. Concatenate both texts with space
2. Parse the combined string
3. Arabic patterns often match first due to specificity
4. English patterns serve as fallback

## Edge Cases

### 1. Missing Components
- Any component can be `null`
- Country defaults to `Saudi Arabia`
- Geocoding may fall back to city center

### 2. Ambiguous Text
```
الملك فهد، الرياض
```
Could be street name or district:
- Without keywords, hard to determine
- May require context or default assumptions

### 3. Multiple Separators
```
شارع الملك فهد - حي العليا - الرياض
```
- Handle both commas and dashes
- Adjust regex patterns accordingly

### 4. Abbreviated Forms
```
ش الملك فهد
```
- `ش` is shorthand for `شارع`
- Include in keyword list

## Geocoding Format

After normalization, format for Nominatim:
```
{street}, {district}, {city}, {country}
```

Example:
```
الملك فهد, العليا, Riyadh, Saudi Arabia
```

Notes:
- Skip `null` components
- Use English city name for better Nominatim results
- Include country for context

## Confidence Scoring

Factors affecting confidence:
1. **Number of matched components**: More components = higher confidence
2. **Specificity**: Street address > district > city
3. **Nominatim importance score**: Built-in quality metric
4. **Place type**: Building/address > area > city/country

Confidence ranges:
- `0.8-1.0`: Complete address with street, district, city
- `0.5-0.8`: Partial address with city and one other component
- `0.2-0.5`: City-level only
- `0.0-0.2`: Fallback to default location

## Best Practices

1. **Always validate input**: Check for empty or malformed data
2. **Log parsing results**: Track which patterns match for debugging
3. **Use bilingual when available**: Improves accuracy
4. **Graceful degradation**: Return partial results rather than errors
5. **Cache common addresses**: Reduce API calls for repeated addresses
6. **Monitor confidence scores**: Alert on low-confidence results
7. **User feedback loop**: Allow corrections to improve patterns

## Future Enhancements

1. **Building/Unit Numbers**: Extract apartment/office numbers
2. **Landmarks**: Recognize common landmarks as reference points
3. **P.O. Boxes**: Handle `صندوق بريد` patterns
4. **Additional Cities**: Expand beyond major cities
5. **Machine Learning**: Train model on actual address corpus
6. **Address Validation**: Cross-reference with official databases
7. **Fuzzy Matching**: Handle typos and variations

## References

- [Saudi Post Address Standards](https://www.sp.com.sa/)
- [Nominatim API Documentation](https://nominatim.org/release-docs/latest/)
- [Arabic Text Processing Best Practices](https://unicode.org/reports/tr9/)
