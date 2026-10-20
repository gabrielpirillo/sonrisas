import WidgetContainer from "@/components/widget/WidgetContainer";
import { Card } from "@/components/ui/card";

export default function WidgetPage() {
    return (
        <Card className="wf-page-card relative overflow-clip bg-white p-0 gap-0 rounded-none border-0 shadow-none sm:rounded-[2rem] sm:border sm:border-[var(--blue-line)] sm:shadow-[0_40px_90px_-46px_rgba(27,38,48,0.45)]">
            <div className="p-0">
                <WidgetContainer />
            </div>
        </Card>
    );
}
