/**
 * Arabic for the nearby work (owner rule, 2026-11-25): the feed and the ads decided by distance,
 * the reach an ad deal may set, and the location check. English is the key; digits stay 0-9.
 */
export const nearbyCopy: Record<string, string> = {
  // Algorithm settings: the two nearby groups
  'Nearby: the feed': 'القريب: الفيد',
  'Nearby: the ads': 'القريب: الإعلانات',
  'When the person shares a position, the real distance decides the feed. A place 3 km away counts half as near as one next door.':
    'لما الشخص يبعت مكانه، المسافة الحقيقية هي اللي بترتب الفيد. المكان اللي على بعد 3 كم بيتحسب نص قربه زي اللي جنبك.',
  'Ads are served by the nearest region. A place 5 km away counts half as near as one next door, and no ad is shown past the furthest distance.':
    'الإعلانات بتتخدم من أقرب منطقة. المكان اللي على بعد 5 كم بيتحسب نص قربه زي اللي جنبك، ومفيش إعلان بيظهر بعد أقصى مسافة.',
  'Feed: how strongly nearness counts': 'الفيد: قوة تأثير القرب',
  'Feed: the half distance (km)': 'الفيد: نصف المسافة (كم)',
  'Feed: the furthest distance (km)': 'الفيد: أقصى مسافة (كم)',
  'Feed: the lowest nearness': 'الفيد: أقل قرب',
  'Ads: how strongly nearness counts': 'الإعلانات: قوة تأثير القرب',
  'Ads: the half distance (km)': 'الإعلانات: نصف المسافة (كم)',
  'Ads: the furthest distance (km)': 'الإعلانات: أقصى مسافة (كم)',

  // Ads campaign form: the deal's reach
  'Show within N km of the place': 'يظهر في نطاق كام كم من المكان',
  'Distance in km': 'المسافة بالكم',
  'No limit': 'من غير حد',
  'Leave it empty and the ad reaches everyone the targeting already allows.': 'سيبه فاضي والإعلان يوصل لكل اللي الاستهداف بيسمح بيه.',
  'Write a whole number of km from 1 to 200, or leave it empty.': 'اكتب عدد صحيح من 1 لـ 200 كم، أو سيبه فاضي.',
  'Reach': 'النطاق',
  'within': 'في نطاق',
  'km of the place': 'كم من المكان',

  // Places: the location check
  'Location check': 'فحص المواقع',
  'Pins that cannot be trusted: more than 40 km from the city centre, shared with another place, or outside Egypt. Open a row to fix the pin.':
    'أماكن مش مظبوطة: أبعد من 40 كم عن مركز المدينة، أو بنفس نقطة مكان تاني، أو بره مصر. افتح أي صف تصلّح الموقع.',
  'More than 40 km from the city centre': 'أبعد من 40 كم عن مركز المدينة',
  'The pin of a place should be where the place really is. This list is how far each pin sits from the centre of its city.':
    'المكان لازم يكون متسجل في مكانه الحقيقي. القائمة دي بتوري كل نقطة بعيدة قد إيه عن مركز مدينتها.',
  'Same pin as another place': 'نفس نقطة مكان تاني',
  'Two places on one point on the map cannot both be right: one of them is wrong.':
    'مكانين على نفس النقطة في الخريطة مش ممكن يكونوا الاتنين صح: واحد منهم غلط.',
  'Outside Egypt': 'بره مصر',
  'A pin outside Egypt is never served to a visitor who shares a position from inside it.':
    'النقطة اللي بره مصر مش بتوصل لزائر بيبعت مكانه من داخل مصر.',
  'No place is that far from its city centre.': 'مفيش مكان بعيد كده عن مركز مدينته.',
  'No two places share a pin.': 'مفيش مكانين على نفس النقطة.',
  'No pin is outside Egypt.': 'مفيش نقطة بره مصر.',
  'These cities have no centre on file, so their places cannot be judged by distance':
    'المدن دي ملهاش مركز متسجل، فمينفعش نحكم على أماكنها بالمسافة',
  'Distance': 'المسافة',
  'Coordinates': 'الإحداثيات',
  'Place': 'المكان',
  'City': 'المدينة',
  'Unknown': 'غير معروف',
  'Far from the centre': 'بعيد عن المركز',
  'Shared point': 'نقطة مشتركة',
  'Outside the country': 'بره البلد',
  'Could not load the location check.': 'تعذّر تحميل فحص المواقع.',
  'Fixed pins stay off these lists.': 'النقط اللي اتصلّحت بتخرج من القوايم دي.',
};
