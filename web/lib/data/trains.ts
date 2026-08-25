import type { ClassAvailability, TrainService } from '@/types/journey';
import { stations } from './stations';

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
];
