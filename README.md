# Puffball Web Scraper

Welcome to the Puffball project! This is a powerful, flexible, and user-friendly web scraping tool designed with the goal of making data collection more efficient and accessible. Whether you're a developer, a data scientist, or just a curious individual, this tool is designed to help you gather and analyze data from the web.

The project was born out of a personal need for a robust, yet simple, web scraping tool that could handle a variety of scraping tasks. It's been developed and refined over time, and will continue to be improved upon based on user feedback and personal use.

## License

This project is licensed under the MIT License. Feel free to fork, change, and use it as you see fit.

## Features

- [x] **Basic scraping**
- [x] **Automation**
- [x] **GitHub Gist Integration**
- [ ] **Better error handling**
- [ ] **Task queueing/rescheduling**
- [ ] **Dedicated server**
- [ ] **Deep scraping**

## Usage

To use this scraper, add a JSON file into the `/sites` directory. The JSON file should follow this template:

```json
{
  "filter": {
    "title": ["MIDDLE", "ANGULAR", ".NET", "C#", "VUEJS"]
  },
  "format": "\nJob Title: ${title}\nCompany: ${company}\nDate: ${date}\nLocation: ${location}\nLink: ${link}\nSalary: ${salary}\n------------------------\n",
  "url": "https://www.topcv.vn/tim-viec-lam-frontend-developer-tai-ha-noi-kl1?sort=new",
  "scrapeContent": {
    "content": {
      "listItem": ".job-item-search-result",
      "data": {
        "title": {
          "selector": ".body h3.title span",
          "attr": "title"
        },
        "company": {
          "selector": ".body a.company"
        },
        "date": {
          "selector": ".info .label-content label.address:last-child"
        },
        "salary": {
          "selector": ".box-right label.title-salary"
        },
        "location": {
          "selector": ".info .label-content label.address:first-child"
        },
        "link": {
          "selector": ".body h3.title a",
          "attr": "href"
        }
      }
    }
  }
}
```

### Field Explanation

- `filter`: This field is used to filter the scraped data. The keys should match the keys in the `data` field of `scrapeContent`. The values are arrays of strings that the corresponding data field should contain.
- `format`: This is the format of the output. You can use `${key}` to substitute the value of the corresponding key in the scraped data.
- `url`: The URL of the website to scrape.
- `scrapeContent`: The configuration for the scraping. `result` is the root element to scrape, and `data` contains the selectors for the data fields to scrape.

## Environment Variables

Please check the `env.example` file to see the required environment variables. It includes:

- `GIT_TOKEN`: Your GitHub token, used for pushing the formatted scrape content to GitHub Gist.
- `ABORT_ON`: A value between 0.0 and 1.0. When bulk scraping, if the failure rate reaches this threshold, the uploading process will halt. It's default to 0 (No abort).

## Running the Program

To run the program, first build it with `pnpm build`, then start it with `pnpm start`.

## Development

This project is actively being developed and improved upon. Your contributions and suggestions are welcome!

```
Please modify it as needed to better suit your project and style. Happy coding!
```
