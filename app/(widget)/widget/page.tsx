import WidgetContainer from "@/components/widget/WidgetContainer";
import { Card } from "@/components/ui/card";

export default function WidgetPage() {
    return (
        <Card className="relative border border-[var(--blue-line)] shadow-[0_40px_90px_-46px_rgba(27,38,48,0.45)] overflow-hidden bg-white rounded-[2rem] p-0 gap-0">
            <div className="p-0">
                <WidgetContainer />
            </div>
        </Card>
    );
}
