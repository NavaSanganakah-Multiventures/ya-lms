import Wrapper from './Wrapper';

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default function Page({ params }: { params: Promise<{ roomId: string }> }) {
  return <Wrapper params={params} />;
}
