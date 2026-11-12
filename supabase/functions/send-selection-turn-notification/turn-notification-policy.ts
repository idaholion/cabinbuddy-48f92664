interface SecondaryTurn {
  started_at: string | null;
  current_family_group: string | null;
  turn_completed: boolean | null;
}

export function getTurnNotificationPolicy(
  family: string,
  secondary: SecondaryTurn | null,
  primaryCompleted: boolean,
  secondaryCompleted = false,
  primaryFamily?: string | null,
) {
  const secondaryPhase = !!secondary?.started_at;
  if (secondaryPhase) {
    return {
      secondaryPhase,
      skip: secondary?.current_family_group !== family || secondary?.turn_completed === true || secondaryCompleted,
    };
  }
  return { secondaryPhase, skip: primaryCompleted || (primaryFamily !== undefined && primaryFamily !== family) };
}