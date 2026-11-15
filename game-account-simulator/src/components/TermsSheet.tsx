import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { Button } from '@/ui/Button';

const SECTIONS: [string, string][] = [
  ['A simulator, not a real platform', 'Blockora is an independent game-account simulator. It is not affiliated with, endorsed by, or connected to Roblox Corporation or any other company. Nothing in Blockora is a real account on another service.'],
  ['Orbs are simulated', 'Orbs are earned by playing and completing activities. They have no monetary value, cannot be bought with or exchanged for real money, Robux, or anything outside Blockora, and may be adjusted by developers for testing.'],
  ['Play fair', 'Do not use Blockora to deceive people — for example by presenting simulated balances, followers or items as real. Do not harass other players or try to exploit the service.'],
  ['Your data', 'We store your email, username, profile, avatar, game activity and simulated economy history to run the service. Your email is never shown to other players. You control who sees your inventory, friends and activity in Settings.'],
  ['Moderation', 'Players can be reported and blocked. Developers may review reports and suspend accounts that break these rules. Every developer action is recorded in an audit log.'],
];

export function TermsSheet({ visible, onClose, onAccept }: { visible: boolean; onClose: () => void; onAccept?: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Terms & Privacy" footer={onAccept ? <Button title="I agree" onPress={onAccept} fullWidth testID="terms-accept" /> : undefined}>
      {SECTIONS.map(([h, b]) => (
        <Text key={h} variant="body" tone="muted">
          <Text variant="bodyStrong">{h}. </Text>
          {b}
        </Text>
      ))}
    </Sheet>
  );
}
