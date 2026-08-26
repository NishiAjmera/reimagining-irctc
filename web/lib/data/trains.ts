import type { ClassAvailability, TrainService } from '@/types/journey';
import { primaryStationByCity, stations } from './stations';

const cls = (code: string, name: string, fare: number, status: ClassAvailability['status'], confidence: number, position?: number): ClassAvailability => ({
  code, name, fare, status, confidence, position,
});

export const trains: TrainService[] = [
  {
    id: 'jaipur-superfast-fri', trainNumber: '12975', trainName: 'Jaipur Superfast Express',
    departureStation: stations.SBC, arrivalStation: stations.JP,
    departureDateTime: '2026-08-28T20:15:00+05:30', arrivalDateTime: '2026-08-29T13:20:00+05:30', durationMinutes: 1025,
    classes: [cls('3A', 'AC 3 Tier', 2450, 'CONFIRMED', 97), cls('SL', 'Sleeper', 1600, 'CONFIRMED', 96)],
    trainTags: ['overnight', 'seniorFriendly'],
  },
  {
    id: 'rajdhani-fri', trainNumber: '22674', trainName: 'Bengaluru–Jaipur Rajdhani',
    departureStation: stations.YPR, arrivalStation: stations.JP,
    departureDateTime: '2026-08-28T18:45:00+05:30', arrivalDateTime: '2026-08-29T11:10:00+05:30', durationMinutes: 985,
    classes: [cls('2A', 'AC 2 Tier', 3250, 'RAC', 82, 4), cls('3A', 'AC 3 Tier', 2550, 'WAITLIST', 72, 8)],
    trainTags: ['fastest', 'premium', 'overnight', 'seniorFriendly'],
  },
  {
    id: 'aravali-thu', trainNumber: '19714', trainName: 'Aravali Express',
    departureStation: stations.SMVB, arrivalStation: stations.JP,
    departureDateTime: '2026-08-27T19:30:00+05:30', arrivalDateTime: '2026-08-28T10:50:00+05:30', durationMinutes: 920,
    classes: [cls('3A', 'AC 3 Tier', 2150, 'CONFIRMED', 99), cls('SL', 'Sleeper', 1420, 'CONFIRMED', 99)],
    trainTags: ['overnight', 'seniorFriendly'],
    searchDateOffset: -1,
  },
  {
    id: 'jaipur-mail-late', trainNumber: '16532', trainName: 'Jaipur Mail',
    departureStation: stations.SBC, arrivalStation: stations.GADJ,
    departureDateTime: '2026-08-28T22:00:00+05:30', arrivalDateTime: '2026-08-29T17:30:00+05:30', durationMinutes: 1170,
    classes: [cls('3A', 'AC 3 Tier', 2260, 'CONFIRMED', 95), cls('SL', 'Sleeper', 1490, 'CONFIRMED', 96)],
    trainTags: ['overnight', 'budget'],
  },
  {
    id: 'indore-intercity', trainNumber: '12415', trainName: 'Indore–New Delhi Intercity',
    departureStation: stations.INDB, arrivalStation: stations.NDLS,
    departureDateTime: '2026-08-29T16:35:00+05:30', arrivalDateTime: '2026-08-30T06:10:00+05:30', durationMinutes: 815,
    classes: [cls('3A', 'AC 3 Tier', 1680, 'CONFIRMED', 94), cls('SL', 'Sleeper', 860, 'CONFIRMED', 97)],
    trainTags: ['overnight', 'budget'],
  },
  {
    id: 'malwa-express', trainNumber: '12919', trainName: 'Malwa Express',
    departureStation: stations.INDB, arrivalStation: stations.NZM,
    departureDateTime: '2026-08-29T12:15:00+05:30', arrivalDateTime: '2026-08-30T03:40:00+05:30', durationMinutes: 925,
    classes: [cls('2A', 'AC 2 Tier', 2240, 'RAC', 85, 2), cls('3A', 'AC 3 Tier', 1550, 'WAITLIST', 77, 5)],
    trainTags: ['premium'],
  },
  route('mumbai-rajdhani', '12951', 'Mumbai Rajdhani Express', 'MMCT', 'NDLS', '17:00', 960, 2860, ['premium', 'overnight', 'seniorFriendly']),
  route('august-kranti', '12953', 'August Kranti Rajdhani Express', 'MMCT', 'NZM', '17:10', 1015, 2750, ['premium', 'overnight']),
  route('howrah-rajdhani', '12302', 'Howrah Rajdhani Express', 'NDLS', 'HWH', '16:50', 1030, 2890, ['premium', 'overnight', 'seniorFriendly']),
  route('tamil-nadu-express', '12622', 'Tamil Nadu Express', 'NDLS', 'MAS', '21:05', 1980, 3150, ['overnight']),
  route('karnataka-express', '12628', 'Karnataka Express', 'NDLS', 'SBC', '20:20', 2340, 3340, ['overnight']),
  route('blr-chennai-shatabdi', '12028', 'Bengaluru–Chennai Shatabdi', 'SBC', 'MAS', '06:00', 300, 1240, ['fastest', 'premium', 'seniorFriendly']),
  route('charminar-express', '12759', 'Charminar Express', 'MAS', 'HYB', '18:10', 760, 1620, ['overnight']),
  route('jan-shatabdi-east', '12073', 'Howrah–Bhubaneswar Jan Shatabdi', 'HWH', 'BBS', '13:25', 405, 980, ['fastest', 'seniorFriendly']),
  route('lucknow-shatabdi', '12004', 'Lucknow Shatabdi Express', 'NDLS', 'LKO', '06:10', 410, 1140, ['fastest', 'premium', 'seniorFriendly']),
  route('chandigarh-shatabdi', '12045', 'Chandigarh Shatabdi Express', 'NDLS', 'CDG', '07:15', 205, 890, ['fastest', 'seniorFriendly']),
  route('bhopal-shatabdi', '12002', 'Bhopal Shatabdi Express', 'NDLS', 'RKMP', '06:00', 425, 1390, ['fastest', 'premium', 'seniorFriendly']),
  route('mumbai-pune-intercity', '12127', 'Mumbai–Pune Intercity Express', 'CSMT', 'PUNE', '06:40', 205, 720, ['fastest', 'budget']),
  route('ahmedabad-shatabdi', '12009', 'Mumbai–Ahmedabad Shatabdi', 'MMCT', 'ADI', '06:20', 410, 1250, ['fastest', 'premium']),
  route('trivandrum-mail', '12623', 'Chennai–Thiruvananthapuram Mail', 'MAS', 'ERS', '19:45', 720, 1580, ['overnight']),
  route('patna-jan-shatabdi', '12023', 'Howrah–Patna Jan Shatabdi', 'HWH', 'PNBE', '14:05', 490, 1120, ['fastest', 'seniorFriendly']),
  route('hyderabad-express', '17013', 'Pune–Hyderabad Express', 'PUNE', 'HYB', '14:30', 610, 1350, ['budget', 'overnight']),
];

function route(id: string, trainNumber: string, trainName: string, from: string, to: string, departure: string, durationMinutes: number, acFare: number, trainTags: TrainService['trainTags']): TrainService {
  const departureDateTime = `2026-08-29T${departure}:00+05:30`;
  return {
    id, trainNumber, trainName,
    departureStation: stations[from], arrivalStation: stations[to],
    departureDateTime,
    arrivalDateTime: new Date(new Date(departureDateTime).getTime() + durationMinutes * 60_000).toISOString(),
    durationMinutes,
    classes: [cls('3A', 'AC 3 Tier', acFare, 'CONFIRMED', 91), cls('SL', 'Sleeper', Math.round(acFare * 0.58), 'RAC', 78, 6)],
    trainTags,
  };
}

export function createSampleServices(originCity: string, destinationCity: string): TrainService[] {
  const departureStation = primaryStationByCity[originCity];
  const arrivalStation = primaryStationByCity[destinationCity];
  if (!departureStation || !arrivalStation || departureStation.code === arrivalStation.code) return [];

  const routeSeed = [...`${originCity}-${destinationCity}`].reduce((total, character) => total + character.charCodeAt(0), 0);
  const duration = 360 + (routeSeed % 13) * 70;
  const baseFare = 980 + (routeSeed % 9) * 170;
  const definitions = [
    { suffix: 'express', name: `${originCity}–${destinationCity} Express`, time: '06:35', minutes: duration, fare: baseFare, tags: ['seniorFriendly'] as TrainService['trainTags'] },
    { suffix: 'intercity', name: `${originCity} Intercity`, time: '15:20', minutes: Math.max(240, duration - 55), fare: baseFare + 260, tags: ['fastest', 'premium'] as TrainService['trainTags'] },
    { suffix: 'night', name: `${destinationCity} Night Mail`, time: '21:10', minutes: duration + 75, fare: Math.max(620, baseFare - 210), tags: ['overnight', 'budget'] as TrainService['trainTags'] },
  ];

  return definitions.map((definition, index) => route(
    `sample-${routeSeed}-${definition.suffix}`,
    String(11000 + ((routeSeed * 17 + index * 101) % 8999)),
    definition.name,
    departureStation.code,
    arrivalStation.code,
    definition.time,
    definition.minutes,
    definition.fare,
    definition.tags,
  ));
}
