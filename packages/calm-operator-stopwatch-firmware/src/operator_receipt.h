#pragma once

namespace calm_operator {

enum class DeliveryReceiptState {
  Queued,
  Delivered,
  Failed,
};

struct DeliveryReceiptPresentation {
  const char* title;
  const char* symbol;
  const char* footer;
};

constexpr DeliveryReceiptPresentation deliveryReceiptPresentation(
    DeliveryReceiptState state) {
  return state == DeliveryReceiptState::Delivered
             ? DeliveryReceiptPresentation{"DELIVERED", "✓", "DELIVERED"}
         : state == DeliveryReceiptState::Failed
             ? DeliveryReceiptPresentation{"DELIVERY FAILED", "!", "FAILED"}
             : DeliveryReceiptPresentation{"QUEUED", "…", "WAITING"};
}

constexpr bool shouldPollDeliveryReceipt(
    bool has_decision_id,
    DeliveryReceiptState state) {
  return has_decision_id && state == DeliveryReceiptState::Queued;
}

}  // namespace calm_operator
