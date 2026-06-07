// ASP.NET Core + EF Core controller exposing order summary and report endpoints.
// Eval fixture for the performance-audit skill (illustrative). Answer key in
// expected-findings.md — assessor-only; do not read it when auditing this fixture.

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("orders")]
public class OrdersController : ControllerBase
{
    private readonly ShopContext _db;
    public OrdersController(ShopContext db) => _db = db;

    [HttpGet("summary")]
    public async Task<IActionResult> Summary()
    {
        var orders = await _db.Orders.Where(o => o.Status == "paid").ToListAsync();
        var lines = new List<string>();
        foreach (var o in orders)
        {
            var name = o.Customer.Name;
            string line = "";
            line += o.Id + ",";
            line += name + ",";
            line += o.TotalCents;
            lines.Add(line);
        }
        return Ok(lines);
    }

    [HttpGet("report")]
    public IActionResult Report()
    {
        var all = _db.Orders.ToList();
        var paid = all.Where(o => o.TotalCents > 0)
                       .Select(o => new { o.Id, o.TotalCents })
                       .ToList();

        var count = _db.Orders.CountAsync().Result;

        return Ok(new { paid, count });
    }

    // Sums the values that parse as integers, skipping any that don't.
    public int SumValidQuantities(IEnumerable<string> raw)
    {
        int sum = 0;
        foreach (var s in raw)
        {
            try { sum += int.Parse(s); }
            catch (FormatException) { /* skip */ }
        }
        return sum;
    }

    private static readonly string[] Regions = { "us", "eu", "apac" };
    public bool RegionAllowed(string r) => Regions.Where(x => x == r).Any();
}
