// Adapted from React Native Reusables (MIT, https://github.com/founded-labs/react-native-reusables); see THIRD_PARTY.md.
// deno-lint-ignore-file
import { cn } from '@/shared/lib/cn';
import { View } from 'react-native';

function Skeleton({
  className,
  ...props
}: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
  return <View className={cn('bg-accent animate-pulse rounded-md', className)} {...props} />;
}

export { Skeleton };
