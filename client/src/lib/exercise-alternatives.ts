import type { Exercise, ExerciseAlternative } from "@shared/userData";

export type ExerciseSwapOption = ExerciseAlternative & {
  isCurrent: boolean;
  isOriginal: boolean;
};

export function getPrimaryExercise(exercise: Exercise) {
  return exercise.primary ?? {
    id: exercise.id,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
  };
}

export function getExerciseSwapOptions(exercise: Exercise): ExerciseSwapOption[] {
  const primary = getPrimaryExercise(exercise);
  const options: ExerciseAlternative[] = [
    {
      id: primary.id,
      name: primary.name,
      muscleGroup: primary.muscleGroup,
      reason: exercise.primary ? "Original exercise" : "Current plan",
    },
    ...(exercise.alternatives ?? []),
  ];

  const seen = new Set<string>();

  return options
    .filter((option) => {
      const key = option.id || option.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((option) => ({
      ...option,
      isCurrent: option.name === exercise.name,
      isOriginal: option.name === primary.name,
    }));
}
