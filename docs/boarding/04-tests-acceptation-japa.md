# Jeu de Tests d'Acceptation Japa - V1 / V1.1

## 1) Objectif

Valider les parcours embarquement terrain, les règles métier critiques et les exceptions demandées.

## 2) Stratégie de test

- Tests fonctionnels HTTP + permissions.
- Tests orientés comportement utilisateur (admin/employé).
- Vérification base de données et audit après chaque action critique.
- Tests idempotence et conflits.
- Séparation par lots : V1 puis V1.1.

## 3) Pré-requis techniques

- Usine de données : company, agencies, users, roles, trips, bookings, tickets.
- Seed statuts ticket couvrant pending/boarded/no-show/cancelled/refunded/reprogrammed.
- Helpers de temps pour simuler fenêtre embarquement.
- Fake mailer pour rapport quotidien et feedback +2h.
- Event bus/métriques mockables si nécessaire.

## 4) Organisation recommandée

- tests/functional/boarding/departures.spec.ts
- tests/functional/boarding/passenger_list.spec.ts
- tests/functional/boarding/actions_boarding.spec.ts
- tests/functional/boarding/actions_scan.spec.ts
- tests/functional/boarding/offlist.spec.ts
- tests/functional/boarding/history_export.spec.ts
- tests/functional/boarding/offline_sync.spec.ts
- tests/functional/boarding/scheduled_jobs.spec.ts

## 5) Cas de test V1 (prioritaires)

## 5.1 Parcours heureux employé

- should_show_next_trip_card_for_employee_agency
- should_open_passenger_list_for_next_trip
- should_scan_pending_ticket_and_mark_boarded
- should_increment_boarded_counter_after_scan
- should_create_audit_event_after_board

## 5.2 Permissions et scope

- should_forbid_employee_access_to_other_agency_trip
- should_allow_admin_access_all_agencies
- should_restrict_history_to_employee_agency

## 5.3 Fenêtre temporelle

- should_allow_boarding_inside_standard_window
- should_block_boarding_before_open_window
- should_block_boarding_after_close_window
- should_allow_admin_override_when_company_setting_enabled
- should_forbid_override_for_non_admin

## 5.4 Statuts et transitions

- should_allow_pending_to_boarded
- should_allow_no_show_to_boarded
- should_allow_boarded_to_pending_unboard
- should_allow_pending_to_no_show_manual
- should_reject_double_boarding_on_boarded
- should_reject_boarding_cancelled_ticket
- should_reject_boarding_refunded_ticket
- should_reject_reprogrammed_ticket_on_old_trip

## 5.5 Scan

- should_board_ticket_from_valid_scan_code
- should_return_error_tone_on_invalid_scan_code
- should_return_success_tone_on_valid_scan_code
- should_support_continuous_scan_mode

## 5.6 Liste passagers et recherche

- should_list_all_passengers_for_trip
- should_filter_passengers_by_status
- should_search_passenger_with_fuzzy_name
- should_search_passenger_by_normalized_phone
- should_search_passenger_by_ticket_code

## 5.7 Capacité

- should_block_boarding_when_capacity_inconsistent
- should_show_remaining_seats_counter

## 5.8 No-show automatique

- should_auto_mark_pending_tickets_no_show_at_departure
- should_not_change_boarded_tickets_during_auto_no_show

## 5.9 Export et historique

- should_export_trip_boarding_as_pdf
- should_export_trip_boarding_as_xlsx
- should_include_pending_boarded_no_show_and_timestamps_in_export
- should_filter_history_by_date_agency_trip

## 6) Cas de test V1.1 (durcissement)

## 6.1 Hors liste

- should_attach_offlist_passenger_to_existing_booking_with_justification
- should_reject_offlist_attach_without_justification
- should_reject_offlist_attach_with_unknown_booking_reference

## 6.2 Clôture et états voyage

- should_auto_close_boarding_at_departure_plus_10
- should_reject_boarding_on_closed_trip
- should_hide_full_trips_from_departures_list

## 6.3 Reporting quotidien

- should_generate_daily_agency_report_at_midnight_local
- should_send_daily_report_to_admin_manager_dispatcher

## 6.4 Feedback +2h

- should_enqueue_feedback_email_two_hours_after_trip
- should_include_trip_and_agency_context_in_feedback_payload

## 6.5 Concurrence

- should_prevent_double_boarding_under_race_condition
- should_keep_single_final_status_after_concurrent_requests

## 7) Cas offline sync (V1 cible)

- should_accept_offline_batch_and_apply_events_in_order
- should_prioritize_first_device_timestamp_on_conflict
- should_mark_conflicted_events_without_failing_full_batch
- should_create_audit_entries_for_replayed_offline_events

## 8) Matrice erreurs attendues

| Cas                        | HTTP | error.code                         |
| -------------------------- | ---: | ---------------------------------- |
| Employé hors agence        |  403 | BOARDING_SCOPE_FORBIDDEN           |
| Ticket déjà embarqué       |  409 | BOARDING_TICKET_ALREADY_BOARDED    |
| Ticket non éligible        |  409 | BOARDING_TICKET_NOT_ELIGIBLE       |
| Fenêtre fermée             |  409 | BOARDING_WINDOW_CLOSED             |
| Fenêtre pas encore ouverte |  409 | BOARDING_WINDOW_NOT_OPEN           |
| Capacité incohérente       |  409 | BOARDING_CAPACITY_MISMATCH_BLOCKED |
| Code scan invalide         |  404 | BOARDING_SCAN_CODE_INVALID         |
| Payload invalide           |  422 | BOARDING_SYNC_PAYLOAD_INVALID      |

## 9) Exemple squelette Japa

import { test } from '@japa/runner'

test.group('Boarding - Scan', () => {
test('should scan pending ticket and mark boarded', async ({ client, assert }) => {
// Arrange
// - seed company, agency, employee, trip in open window, pending ticket

    // Act
    const response = await client
      .post('/dashboard/boarding/scan')
      .json({
        tripId: 'trip-uuid',
        scannedCode: 'TCK-123456',
        identityCheckConfirmed: false,
        continuousMode: true,
      })

    // Assert
    response.assertStatus(200)
    response.assertBodyContains({ success: true })
    response.assertBodyContains({ data: { result: 'success' } })

    // assert DB status ticket=boarded + audit event exists
    assert.isTrue(true)

})
})

## 10) Critères de sortie QA

- 100% des scénarios heureux V1 passants.
- 100% des erreurs critiques V1 passantes.
- Aucun test flaky sur 3 runs consécutifs CI.
- V1.1 validé avant activation progressive offline/rapport/feedback.
