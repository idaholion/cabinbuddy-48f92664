interface SecondaryTurn {
  started_at: string | null;
  current_family_group: string | null;
  turn_completed: boolean | null;
}

export function getTurnNotificationPolicy(
  family: string,
  secondary: SecondaryTurn | null,
  primaryCompleted: boolean,
) {
  const secondaryPhase = !!secondary?.started_at;
  if (secondaryPhase) {
    return {
      secondaryPhase,
      skip: secondary?.current_family_group !== family || secondary?.turn_completed === true,
    };
  }
  return { secondaryPhase, skip: primaryCompleted };
}