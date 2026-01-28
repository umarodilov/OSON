export default function Dashboard() {
    return (
        <div className="grid2">
            <div className="card">
                <div className="cardTitle">
                    <b>Today</b><span className="muted">Summary</span>
                </div>
                <div className="muted">Дар ин ҷо: фурӯш имрӯз, насия, склад каммонда</div>
            </div>

            <div className="card">
                <div className="cardTitle">
                    <b>Low stock</b><span className="muted">≤ 5</span>
                </div>
                <div className="muted">Дар ин ҷо: маҳсулотҳои каммонда</div>
            </div>
        </div>
    );
}
